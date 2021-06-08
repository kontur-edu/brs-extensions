import BrsApi, {ControlAction, Discipline, StudentFailure, StudentMark} from '../apis/brsApi';
import {compareNormalized, groupBy, parseAnyFloat} from '../helpers/tools';
import * as fio from '../helpers/fio';
import {ActualStudent, SpreadsheetData} from './SpreadsheetManager';
import {formatStudentFailure} from '../helpers/brsHelpers';
import ReportManager from "./ReportManager";

enum MarkUpdateStatus {
    Updated,
    Failed,
    Skipped,
};

export default class MarksManager {
    private readonly brsApi: BrsApi;
    private readonly save: boolean;
    private cancelPending: boolean = false;

    readonly reportManager: ReportManager;

    constructor(brsApi: BrsApi, reportManager: ReportManager, save: boolean) {
        this.brsApi = brsApi;
        this.reportManager = reportManager;
        this.save = save;
    }

    cancel() {
        this.cancelPending = true;
    }

    async putMarksToBrsAsync(spreadsheetData: SpreadsheetData, disciplines: Discipline[]) {
        const {
            actualStudents,
            disciplineConfig,
            controlActionConfigs,
        } = spreadsheetData;

        try {
            for (const discipline of disciplines) {
                await this.putMarksForDisciplineAsync(
                    discipline,
                    actualStudents.filter(s => compareNormalized(s.groupName, discipline.group)),
                    disciplineConfig.defaultStudentFailure,
                    controlActionConfigs
                );

                if (this.cancelPending) {
                    break;
                }
            }
            return null;
        } catch (e) {
            return e;
        } finally {
            this.reportManager.finishReport();
        }
    }

    async putMarksForDisciplineAsync(
        discipline: Discipline,
        actualStudents: ActualStudent[],
        defaultStudentFailure: StudentFailure,
        controlActionConfigs: ControlActionConfig[]
    ) {
        if (actualStudents.length === 0) return;
        this.reportManager.newReport(discipline.group);

        const controlActions = await this.brsApi.getAllControlActionsCachedAsync(discipline);
        if (!this.checkControlActionsConfiguration(controlActions, controlActionConfigs))
            return;

        const brsStudents = await this.brsApi.getAllStudentMarksAsync(discipline);
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

        await this.putMarksForStudentsAsync(
            discipline,
            mergedStudents,
            controlActionConfigs,
            controlActions
        );

        await this.updateFailuresForSkippedStudentsAsync(
            skippedBrsStudents,
            discipline,
            defaultStudentFailure
        );

        if (this.save) {
            await this.brsApi.updateAllMarksAsync(discipline);
        }

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
        const ratingResults = await Promise.all(students.map(async student => {
            return await this.putMarksForStudentAsync(
                discipline,
                student,
                controlActionConfigs,
                controlActions
            );
        }));

        const groupedResults = Object.entries(groupBy(ratingResults, "status"))
            .map(([groupKey, rawStudents]) => ({
                title: formatMarkUpdateStatus(rawStudents[0]["status"]),
                students: rawStudents.map(s => s.infoString)
            }));

        this.reportManager.currentReport.marks.push(...groupedResults);
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
                throw new Error('Подходящее контрольное мероприятие не найдено');
            }

            const brsMarkString = student.brs[controlAction.uuid] as string;
            const brsMark = parseAnyFloat(brsMarkString);
            const actualMarkString = student.actual.properties[config.propertyIndex];
            const actualMark = parseAnyFloat(actualMarkString);

            const needUpdateMark = !isNaN(actualMark)
                && !(isNaN(brsMark) ? actualMark === 0 : brsMark === actualMark);
            const actualMarkOutput = !isNaN(actualMark) ? actualMark.toString() : '-';
            
            if (needUpdateMark) {
                marks.push(
                    `    ${actualMarkOutput}!`.substr(`${actualMarkOutput}`.length - 1)
                );
            } else {
                marks.push(
                    `    ${actualMarkOutput} `.substr(`${actualMarkOutput}`.length - 1)
                );
                continue;
            }

            try {
                if (this.save) {
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

        const brsFailureStatus =
            (student.brs.failure as StudentFailure) ?? StudentFailure.NoFailure;
        const actualFailure =
            student.actual.failure ?? StudentFailure.NoFailure;
        let failureStatus: string;
        if (actualFailure === brsFailureStatus) {
            failureStatus = `${formatStudentFailure(actualFailure)}`;
        } else {
            failureStatus = `${formatStudentFailure(actualFailure)}!`;
            try {
                if (this.save) {
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

        const status = failed > 0 ? MarkUpdateStatus.Failed : updated > 0 ? MarkUpdateStatus.Updated : MarkUpdateStatus.Skipped;
        const studentName = (student.actual.fullName).substr(0, 30);
        let infoString = `${studentName}, баллы: ${marks.join(' ')}`;
        if (failureStatus && failureStatus !== '-')
            infoString += `, ${failureStatus}`;
        return {status, infoString};
    }

    getSuitableControlAction(config: ControlActionConfig, controlActions: ControlAction[]) {
        const suitableControlActions = controlActions.filter((a) =>
            config.controlActions.some((b) => compareNormalized(a.controlAction, b)));

        const errorMessages = [];

        if (suitableControlActions.length === 0) {
            errorMessages.push(`Все "${config.controlActions.join(', ')}" не найдены `);
            errorMessages.push(`Найденные контрольные мероприятия: ${controlActions
                .map((a) => a.controlAction)
                .join(', ')}`);

            this.reportManager.onInvalidConfiguration(errorMessages);

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
                errorMessages.push(`Неверная конфигурация ${config.controlActions.join(', ')}`);
                errorMessages.push(`Нет соответствий: ${config.matchIndex}/${config.matchCount} 
                                    и ${suitableControlActions.length}`);

                this.reportManager.onInvalidConfiguration(errorMessages);

                return null;
            }
            return suitableControlActions[config.matchIndex];
        }

        if (suitableControlActions.length > 1) {
            errorMessages.push(`Несколько контрольных мероприятий найдены для ${config.controlActions.join(', ')}`);
            errorMessages.push(`Найденные контрольные мероприятия: ${suitableControlActions
                .map((a) => a.controlAction)
                .join(', ')}`);

            this.reportManager.onInvalidConfiguration(errorMessages);

            return null;
        }

        return suitableControlActions[0];
    }

    async updateFailuresForSkippedStudentsAsync(
        students: StudentMark[],
        discipline: Discipline,
        defaultStudentFailure: StudentFailure
    ) {
        const ratingResults = await Promise.all(students.map(student =>
            this.updateFailureForStudent(
                student,
                discipline,
                defaultStudentFailure
            )));

        if (ratingResults.length > 0) {
            const groupedResults = Object.entries(groupBy(ratingResults, "status"))
                .map(([status, rawStudents]) => ({
                    title: `${status} = ${rawStudents.length}`,
                    students: rawStudents.map(s => s.infoString)
                }));

            this.reportManager.currentReport.marks.push(...groupedResults);
        }
    }

    async updateFailureForStudent(
        student: StudentMark,
        discipline: Discipline,
        defaultStudentFailure: StudentFailure
    ) {
        let status: MarkUpdateStatus;
        const brsFailureStatus = student.failure
            ? (student.failure as StudentFailure)
            : StudentFailure.NoFailure;
        const actualFailure = defaultStudentFailure;
        if (actualFailure === brsFailureStatus) {
            status = MarkUpdateStatus.Skipped;
        } else {
            try {
                if (this.save) {
                    await this.brsApi.putStudentFailureAsync(
                        student.studentUuid,
                        discipline,
                        actualFailure
                    );
                }
                status = MarkUpdateStatus.Updated;
            } catch (error) {
                status = MarkUpdateStatus.Failed;
            }
        }

        const studentName = (student.studentFio).substr(0, 30);
        const description =
            status !== MarkUpdateStatus.Skipped
                ? `${formatStudentFailure(
                actualFailure
                )} из ${formatStudentFailure(brsFailureStatus)}`
                : formatStudentFailure(actualFailure);

        const infoString = `${studentName} ${description}`;

        return {status, infoString};
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

        return {mergedStudents, skippedActualStudents, skippedBrsStudents};
    }

    logMergedStudents(
        mergedStudents: MergedStudent[],
        skippedActualStudents: ActualStudent[],
        skippedBrsStudents: StudentMark[]
    ) {
        const report = this.reportManager.currentReport;

        report.merge.succeed = mergedStudents.length;

        if (skippedActualStudents.length > 0)
            report.merge.failedActual = skippedActualStudents.map(s => '- ' + s.fullName);

        if (skippedBrsStudents.length > 0) {
            report.merge.failedBrs = skippedBrsStudents.map(s => '- ' + s.studentFio);
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

function formatMarkUpdateStatus(status: MarkUpdateStatus) {
    switch (status) {
        case MarkUpdateStatus.Updated:
            return 'ОБНОВЛЕНО';
        case MarkUpdateStatus.Skipped:
            return 'ПРОПУЩЕНО';
        case MarkUpdateStatus.Failed:
            return 'ПРОВАЛЕНО';
        default:
            throw new Error('Неизвестный статус обновления оценок');
    }
}

export interface ControlActionConfig {
    controlActions: string[];
    matchIndex?: number;
    matchCount?: number;
    propertyIndex: number;
}

interface MergedStudent {
    actual: ActualStudent;
    brs: StudentMark;
}
