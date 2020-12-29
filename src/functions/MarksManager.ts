import BrsApi, {ControlAction, Discipline, StudentMark} from '../apis/brsApi';
import {compareNormalized, parseAnyFloat} from '../helpers/tools';
import * as fio from '../helpers/fio';
import {ActualStudent} from './readStudentsAsync';
import {MarksData} from "./buildMarksAutoAsync";
import {Logger} from "../helpers/logger";

export default class MarksManager {
    private readonly brsApi: BrsApi;
    private readonly options: PutMarksOptions;
    private cancelPending: boolean = false;
    readonly logger: Logger;

    constructor(brsApi: BrsApi, logger: Logger, options: PutMarksOptions) {
        this.brsApi = brsApi;
        this.logger = logger;
        this.options = options;
    }

    cancel(){
        this.cancelPending = true;
    }

    async putMarksToBrsAsync(marksData: MarksData) {
        const {actualStudents, controlActionConfigs, disciplineConfig} = marksData;

        try {
            const allDisciplines = await this.brsApi.getDisciplineCachedAsync(
                disciplineConfig.year,
                disciplineConfig.termType,
                disciplineConfig.course,
                disciplineConfig.isModule
            );
            const disciplines = allDisciplines.filter(
                d =>
                    compareNormalized(d.discipline, disciplineConfig.name) &&
                    (!disciplineConfig.isSuitableDiscipline ||
                        disciplineConfig.isSuitableDiscipline(d))
            );

            for (const discipline of disciplines) {
                await this.putMarksForDisciplineAsync(
                    discipline,
                    actualStudents.filter(s =>
                        compareNormalized(s.groupName, discipline.group)
                    ),
                    controlActionConfigs,
                );
                if (this.cancelPending) {
                    break;
                }
            }
        } catch (e) {
            this.logger.error(e);
        }
    }

    private async putMarksForDisciplineAsync(
        discipline: Discipline,
        actualStudents: ActualStudent[],
        controlActionConfigs: ControlActionConfig[],
    ) {
        if (actualStudents.length === 0)
            return;
        this.logger.log(`# Processing group ${discipline.group}`);

        const controlActions = await this.brsApi.getAllControlActionsCachedAsync(discipline);
        if (!this.checkControlActionsConfiguration(controlActions, controlActionConfigs)) {
            return;
        }

        const brsStudents = await this.brsApi.getAllStudentMarksAsync(discipline);
        const {
            mergedStudents,
            skippedActualStudents,
            skippedBrsStudents,
        } = this.mergeStudents(actualStudents, brsStudents);
        this.logMergedStudents(mergedStudents, skippedActualStudents, skippedBrsStudents);

        await this.putMarksForStudentsAsync(
            discipline,
            mergedStudents,
            controlActionConfigs,
            controlActions,
        );

        if (this.options.save) {
            debugger
            // await this.brsApi.updateAllMarksAsync(discipline);
        }
    }

    private checkControlActionsConfiguration(
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

    private async putMarksForStudentsAsync(
        discipline: Discipline,
        students: MergedStudent[],
        controlActionConfigs: ControlActionConfig[],
        controlActions: ControlAction[],
    ) {
        const statusCounters: { [k: string]: number } = {};

        for (const student of students) {
            if (this.cancelPending)
                return;
            const status = await this.putMarksForStudentAsync(
                discipline,
                student,
                controlActionConfigs,
                controlActions,
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

    private async putMarksForStudentAsync(
        discipline: Discipline,
        student: MergedStudent,
        controlActionConfigs: ControlActionConfig[],
        controlActions: ControlAction[],
    ) {
        let updated = 0;
        let failed = 0;

        const marks = [];
        for (const config of controlActionConfigs) {
            const controlAction = this.getSuitableControlAction(config, controlActions);
            if (!controlAction) {
                throw new Error();
            }

            const brsMark = parseAnyFloat(student.brs[controlAction.uuid] as string);
            const actualMark = parseAnyFloat(
                student.actual.properties[config.propertyIndex]
            );

            if (actualMark === brsMark || actualMark === 0) {
                marks.push(`    ${actualMark} `.substr(`${actualMark}`.length - 1));
                continue;
            } else {
                marks.push(`    ${actualMark}!`.substr(`${actualMark}`.length - 1));
            }

            try {
                if (this.options.save) {
                    debugger
                    // await this.brsApi.putStudentMarkAsync(
                    //     student.brs.studentUuid,
                    //     controlAction.uuidWithoutPrefix,
                    //     actualMark,
                    //     discipline.groupHistoryId,
                    //     student.brs.cardType,
                    //     student.brs.disciplineLoad
                    // );
                }
                updated++;
            } catch (error) {
                failed++;
            }
        }

        const status = failed > 0 ? 'FAILED ' : updated > 0 ? 'UPDATED' : 'SKIPPED';
        if (this.options.verbose || failed > 0) {
            const studentName = (
                student.actual.fullName + '                              '
            ).substr(0, 30);
            this.logger.log(
                `${status} ${studentName} updated: ${updated}, failed: ${failed}, marks: ${marks.join(
                    ' '
                )}`
            );
        }
        return status;
    }

    private getSuitableControlAction(
        config: ControlActionConfig,
        controlActions: ControlAction[]
    ) {
        const suitableControlActions = controlActions.filter(a =>
            config.controlActions.some(b => compareNormalized(a.controlAction, b))
        );

        if (suitableControlActions.length === 0) {
            this.logger.log(`All of ${config.controlActions.join(', ')} not found`);
            this.logger.log(
                `Known actions: ${controlActions.map(a => a.controlAction).join(', ')}`
            );
            return null;
        }

        if (config.matchIndex !== undefined || config.matchCount !== undefined) {
            if (
                config.matchIndex === undefined ||
                config.matchCount === undefined ||
                suitableControlActions.length !== config.matchCount ||
                config.matchIndex >= config.matchCount
            ) {
                this.logger.log(
                    `Invalid configuration of ${config.controlActions.join(', ')}`
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
                `Several control actions found for ${config.controlActions.join(', ')}`
            );
            this.logger.log(
                `Found actions: ${suitableControlActions
                    .map(a => a.controlAction)
                    .join(', ')}`
            );
            return null;
        }

        return suitableControlActions[0];
    }

    private mergeStudents(
        actualStudents: ActualStudent[],
        brsStudents: StudentMark[],
    ) {
        const activeBrsStudents = brsStudents.filter(MarksManager.isStudentActive);

        const mergedStudents: MergedStudent[] = [];
        const skippedActualStudents: ActualStudent[] = [];
        for (const actualStudent of actualStudents) {
            if (this.cancelPending)
                break;
            const suitableStudents = activeBrsStudents.filter(brsStudent =>
                MarksManager.areStudentsLike(brsStudent, actualStudent)
            );
            if (suitableStudents.length === 1) {
                mergedStudents.push({actual: actualStudent, brs: suitableStudents[0]});
            } else {
                skippedActualStudents.push(actualStudent);
            }
        }

        const skippedBrsStudents: StudentMark[] = [];
        for (const brsStudent of activeBrsStudents) {
            if (
                !mergedStudents.some(ms => ms.brs.studentUuid === brsStudent.studentUuid)
            ) {
                skippedBrsStudents.push(brsStudent);
            }
        }

        return {mergedStudents, skippedActualStudents, skippedBrsStudents};
    }

    private static isStudentActive(brsStudent: StudentMark) {
        return (
            brsStudent.studentStatus !== 'Переведен' &&
            brsStudent.studentStatus !== 'Отчислен'
        );
    }

    private static areStudentsLike(
        brsStudent: StudentMark,
        actualStudent: ActualStudent
    ) {
        const brsFullName = fio.toKey(brsStudent.studentFio);
        const actualFullName = fio.toKey(actualStudent.fullName);
        return brsFullName.startsWith(actualFullName);
    }

    private logMergedStudents(
        mergedStudents: MergedStudent[],
        skippedActualStudents: ActualStudent[],
        skippedBrsStudents: StudentMark[]
    ) {
        this.logger.log(`Merged students = ${mergedStudents.length}`);
        this.logger.log(`Can't merge actual students = ${skippedActualStudents.length}`);
        for (const s of skippedActualStudents) {
            this.logger.log('- ' + s.fullName);
        }
        this.logger.log(`Can't merge BRS students = ${skippedBrsStudents.length}`);
        for (const s of skippedBrsStudents) {
            this.logger.log('- ' + s.studentFio);
        }
    }
}

export interface DisciplineConfig {
    name: string;
    year: number;
    termType: number;
    course: number;
    isModule: boolean;
    isSuitableDiscipline: ((d: Discipline) => boolean) | null;
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
