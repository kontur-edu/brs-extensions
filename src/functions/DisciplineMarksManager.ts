import BrsApi from '../apis/brsApi';
import {
    ControlAction,
    Discipline,
    StudentMark,
    StudentFailure,
} from '../apis/brsApi';
import { parseAnyFloat, compareNormalized } from '../helpers/tools';
import * as fio from '../helpers/fio';
import { ActualStudent } from './readStudentsAsync';
import { formatStudentFailure } from '../helpers/brsHelpers';
import { Logger } from '../helpers/logger';

export default class DisciplineMarksManager {
    private readonly brsApi: BrsApi;
    private readonly options: PutMarksOptions;
    readonly logger: Logger;

    constructor(brsApi: BrsApi, logger: Logger, options: PutMarksOptions) {
        this.brsApi = brsApi;
        this.logger = logger;
        this.options = options;
    }

    async putMarksForDisciplineAsync(
        discipline: Discipline,
        actualStudents: ActualStudent[],
        defaultStudentFailure: StudentFailure,
        controlActionConfigs: ControlActionConfig[]
    ) {
        if (actualStudents.length === 0) return;
        this.logger.log(`# Processing group ${discipline.group}`);
        this.logger.log('');

        const controlActions = await this.brsApi.getAllControlActionsCachedAsync(
            discipline
        );
        if (
            !this.checkControlActionsConfiguration(
                controlActions,
                controlActionConfigs
            )
        ) {
            return;
        }

        const brsStudents = await this.brsApi.getAllStudentMarksAsync(
            discipline
        );
        const {
            mergedStudents,
            skippedActualStudents,
            skippedBrsStudents,
        } = this.mergeStudents(actualStudents, brsStudents);
        this.logMergedStudents(
            mergedStudents,
            skippedActualStudents,
            skippedBrsStudents
        );
        this.logger.log('');

        await this.putMarksForStudentsAsync(
            discipline,
            mergedStudents,
            controlActionConfigs,
            controlActions
        );
        this.logger.log('');

        await this.updateFailuresForSkippedStudentsAsync(
            skippedBrsStudents,
            discipline,
            defaultStudentFailure
        );
        this.logger.log('');

        if (this.options.save) {
            await this.brsApi.updateAllMarksAsync(discipline);
        }

        this.logger.log('');
    }

    checkControlActionsConfiguration(
        controlActions: ControlAction[],
        controlActionConfigs: ControlActionConfig[]
    ) {
        for (const config of controlActionConfigs) {
            if (!this.getSuitableControlAction(config, controlActions)) {
                return false;
            }
        }
        return true;
    }

    async putMarksForStudentsAsync(
        discipline: Discipline,
        students: MergedStudent[],
        controlActionConfigs: ControlActionConfig[],
        controlActions: ControlAction[]
    ) {
        const statusCounters: { [k: string]: number } = {};

        for (const student of students) {
            const status = await this.putMarksForStudentAsync(
                discipline,
                student,
                controlActionConfigs,
                controlActions
            );
            if (statusCounters[status] === undefined) {
                statusCounters[status] = 0;
            }
            statusCounters[status]++;
        }

        this.logger.log('Marks update statuses:');
        for (const k of Object.keys(statusCounters)) {
            this.logger.log(`- ${k} = ${statusCounters[k]}`);
        }
    }

    async putMarksForStudentAsync(
        discipline: Discipline,
        student: MergedStudent,
        controlActionConfigs: ControlActionConfig[],
        controlActions: ControlAction[]
    ) {
        let updated = 0;
        let failed = 0;

        const marks = [];
        for (const config of controlActionConfigs) {
            const controlAction = this.getSuitableControlAction(
                config,
                controlActions
            );
            if (!controlAction) {
                throw new Error();
            }

            const brsMark = parseAnyFloat(
                student.brs[controlAction.uuid] as string
            );
            const actualMark = parseAnyFloat(
                student.actual.properties[config.propertyIndex]
            );

            if (actualMark === brsMark || actualMark === 0) {
                marks.push(
                    `    ${actualMark} `.substr(`${actualMark}`.length - 1)
                );
                continue;
            } else {
                marks.push(
                    `    ${actualMark}!`.substr(`${actualMark}`.length - 1)
                );
            }

            try {
                if (this.options.save) {
                    await this.brsApi.putStudentMarkAsync(
                        student.brs.studentUuid,
                        controlAction.uuidWithoutPrefix,
                        actualMark,
                        discipline.groupHistoryId,
                        student.brs.cardType,
                        student.brs.disciplineLoad
                    );
                }
                updated++;
            } catch (error) {
                failed++;
            }
        }

        const brsFailureStatus = student.brs.failure
            ? (student.brs.failure as StudentFailure)
            : StudentFailure.NoFailure;
        const actualFailure =
            student.actual.failure || StudentFailure.NoFailure;
        let failureStatus = '';
        if (actualFailure === brsFailureStatus) {
            failureStatus = `${formatStudentFailure(actualFailure)}`;
        } else {
            failureStatus = `${formatStudentFailure(actualFailure)}!`;
            try {
                if (this.options.save) {
                    await this.brsApi.putStudentFailureAsync(
                        student.brs.studentUuid,
                        discipline,
                        actualFailure
                    );
                }
                updated++;
            } catch (error) {
                failed++;
            }
        }

        const status =
            failed > 0 ? 'FAILED ' : updated > 0 ? 'UPDATED' : 'SKIPPED';
        if (this.options.verbose || failed > 0) {
            const studentName = (
                student.actual.fullName + '                              '
            ).substr(0, 30);
            this.logger.log(
                `${status} ${studentName} updated: ${updated}, failed: ${failed}, marks: ${marks.join(
                    ' '
                )}, failureStatus: ${failureStatus}`
            );
        }
        return status;
    }

    getSuitableControlAction(
        config: ControlActionConfig,
        controlActions: ControlAction[]
    ) {
        const suitableControlActions = controlActions.filter((a) =>
            config.controlActions.some((b) =>
                compareNormalized(a.controlAction, b)
            )
        );

        if (suitableControlActions.length === 0) {
            this.logger.log(
                `All of ${config.controlActions.join(', ')} not found`
            );
            this.logger.log(
                `Known actions: ${controlActions
                    .map((a) => a.controlAction)
                    .join(', ')}`
            );
            return null;
        }

        if (
            config.matchIndex !== undefined ||
            config.matchCount !== undefined
        ) {
            if (
                config.matchIndex === undefined ||
                config.matchCount === undefined ||
                suitableControlActions.length !== config.matchCount ||
                config.matchIndex >= config.matchCount
            ) {
                this.logger.log(
                    `Invalid configuration of ${config.controlActions.join(
                        ', '
                    )}`
                );
                this.logger.log(
                    `Can't match: ${config.matchIndex}/${config.matchCount} of ${suitableControlActions.length}`
                );
                return null;
            }
            return suitableControlActions[config.matchIndex];
        }

        if (suitableControlActions.length > 1) {
            this.logger.log(
                `Several control actions found for ${config.controlActions.join(
                    ', '
                )}`
            );
            this.logger.log(
                `Found actions: ${suitableControlActions
                    .map((a) => a.controlAction)
                    .join(', ')}`
            );
            return null;
        }

        return suitableControlActions[0];
    }

    async updateFailuresForSkippedStudentsAsync(
        students: StudentMark[],
        discipline: Discipline,
        defaultStudentFailure: StudentFailure
    ) {
        const statusCounters: { [k: string]: number } = {};

        for (const student of students) {
            const status = await this.updateFailureForStudent(
                student,
                discipline,
                defaultStudentFailure
            );
            if (statusCounters[status] === undefined) {
                statusCounters[status] = 0;
            }
            statusCounters[status]++;
        }

        const statusKeys = Object.keys(statusCounters);
        if (statusKeys.length > 0) {
            this.logger.log('Failures update statuses:');
            for (const k of statusKeys) {
                this.logger.log(`- ${k} = ${statusCounters[k]}`);
            }
        } else {
            this.logger.log('No failures for skipped students');
        }
    }

    async updateFailureForStudent(
        student: StudentMark,
        discipline: Discipline,
        defaultStudentFailure: StudentFailure
    ) {
        let status = '';
        const brsFailureStatus = student.failure
            ? (student.failure as StudentFailure)
            : StudentFailure.NoFailure;
        const actualFailure = defaultStudentFailure;
        if (actualFailure === brsFailureStatus) {
            status = 'SKIPPED';
        } else {
            try {
                if (this.options.save) {
                    await this.brsApi.putStudentFailureAsync(
                        student.studentUuid,
                        discipline,
                        actualFailure
                    );
                }
                status = 'UPDATED';
            } catch (error) {
                status = 'FAILED';
            }
        }

        if (this.options.verbose || status === 'FAILED') {
            const studentName = (
                student.studentFio + '                              '
            ).substr(0, 30);
            const description =
                status !== 'SKIPPED'
                    ? `${formatStudentFailure(
                          actualFailure
                      )} from ${formatStudentFailure(brsFailureStatus)}`
                    : formatStudentFailure(actualFailure);
            this.logger.log(`${status} ${studentName} ${description}`);
        }
        return status;
    }

    mergeStudents(actualStudents: ActualStudent[], brsStudents: StudentMark[]) {
        const activeBrsStudents = brsStudents.filter(isStudentActive);

        const mergedStudents: MergedStudent[] = [];
        const skippedActualStudents: ActualStudent[] = [];
        for (const actualStudent of actualStudents) {
            const suitableStudents = activeBrsStudents.filter((brsStudent) =>
                areStudentsLike(brsStudent, actualStudent)
            );
            if (suitableStudents.length === 1) {
                mergedStudents.push({
                    actual: actualStudent,
                    brs: suitableStudents[0],
                });
            } else {
                skippedActualStudents.push(actualStudent);
            }
        }

        const skippedBrsStudents: StudentMark[] = [];
        for (const brsStudent of activeBrsStudents) {
            if (
                !mergedStudents.some(
                    (ms) => ms.brs.studentUuid === brsStudent.studentUuid
                )
            ) {
                skippedBrsStudents.push(brsStudent);
            }
        }

        return { mergedStudents, skippedActualStudents, skippedBrsStudents };
    }

    logMergedStudents(
        mergedStudents: MergedStudent[],
        skippedActualStudents: ActualStudent[],
        skippedBrsStudents: StudentMark[]
    ) {
        this.logger.log(`Merged students = ${mergedStudents.length}`);
        this.logger.log(
            `Can't merge actual students = ${skippedActualStudents.length}`
        );
        for (const s of skippedActualStudents) {
            this.logger.log('- ' + s.fullName);
        }
        this.logger.log(
            `Can't merge BRS students = ${skippedBrsStudents.length}`
        );
        for (const s of skippedBrsStudents) {
            this.logger.log('- ' + s.studentFio);
        }
    }
}

function isStudentActive(brsStudent: StudentMark) {
    return (
        brsStudent.studentStatus !== 'Переведен' &&
        brsStudent.studentStatus !== 'Отчислен'
    );
}

function areStudentsLike(
    brsStudent: StudentMark,
    actualStudent: ActualStudent
) {
    const brsFullName = fio.toKey(brsStudent.studentFio);
    const actualFullName = fio.toKey(actualStudent.fullName);
    return brsFullName.startsWith(actualFullName);
}

export interface ControlActionConfig {
    controlActions: string[];
    matchIndex?: number;
    matchCount?: number;
    propertyIndex: number;
}

export interface PutMarksOptions {
    save: boolean;
    verbose: boolean;
}

interface MergedStudent {
    actual: ActualStudent;
    brs: StudentMark;
}
