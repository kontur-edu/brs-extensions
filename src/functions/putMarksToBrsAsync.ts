import BrsApi, {ControlAction, Discipline, StudentMark} from '../apis/brsApi';
import {compareNormalized, parseAnyFloat} from '../helpers/tools';
import * as fio from '../helpers/fio';
import {ActualStudent} from './readStudentsAsync';
import {MarksData} from "./buildMarksAutoAsync";
import {Logger} from "../helpers/logger";

let brsApi: BrsApi;
let logger: Logger;

export default async function putMarksToBrsAsync(
    brsApiLocal: BrsApi,
    loggerLocal: Logger,
    marksData: MarksData,
    options: PutMarksOptions
) {
    const {actualStudents, controlActionConfigs, disciplineConfig} = marksData;
    brsApi = brsApiLocal;
    logger = loggerLocal;

    try {
        const allDisciplines = await brsApi.getDisciplineCachedAsync(
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
            await putMarksForDisciplineAsync(
                discipline,
                actualStudents.filter(s =>
                    compareNormalized(s.groupName, discipline.group)
                ),
                controlActionConfigs,
                options
            );
            if (options.cancelPending) {
                break;
            }
        }
    } catch (e) {
        logger.error(e);
    }
}

async function putMarksForDisciplineAsync(
    discipline: Discipline,
    actualStudents: ActualStudent[],
    controlActionConfigs: ControlActionConfig[],
    options: PutMarksOptions
) {
    if (actualStudents.length === 0)
        return;
    logger.log(`# Processing group ${discipline.group}`);

    const controlActions = await brsApi.getAllControlActionsCachedAsync(discipline);
    if (!checkControlActionsConfiguration(controlActions, controlActionConfigs)) {
        return;
    }

    const brsStudents = await brsApi.getAllStudentMarksAsync(discipline);
    const {
        mergedStudents,
        skippedActualStudents,
        skippedBrsStudents,
    } = mergeStudents(actualStudents, brsStudents, options);
    logMergedStudents(mergedStudents, skippedActualStudents, skippedBrsStudents);

    await putMarksForStudentsAsync(
        discipline,
        mergedStudents,
        controlActionConfigs,
        controlActions,
        options
    );

    if (options.save) {
        debugger
        // await brsApi.updateAllMarksAsync(discipline);
    }
}

function checkControlActionsConfiguration(
    controlActions: ControlAction[],
    controlActionConfigs: ControlActionConfig[]
) {
    for (const config of controlActionConfigs) {
        if (!getSuitableControlAction(config, controlActions)) {
            return false;
        }
    }
    return true;
}

async function putMarksForStudentsAsync(
    discipline: Discipline,
    students: MergedStudent[],
    controlActionConfigs: ControlActionConfig[],
    controlActions: ControlAction[],
    options: PutMarksOptions
) {
    const statusCounters: { [k: string]: number } = {};

    for (const student of students) {
        if (options.cancelPending)
            return;
        const status = await putMarksForStudentAsync(
            discipline,
            student,
            controlActionConfigs,
            controlActions,
            options
        );
        if (statusCounters[status] === undefined) {
            statusCounters[status] = 0;
        }
        statusCounters[status]++;
    }

    logger.log('Marks update statuses:');
    for (const k of Object.keys(statusCounters)) {
        logger.log(`- ${k} = ${statusCounters[k]}`);
    }
}

async function putMarksForStudentAsync(
    discipline: Discipline,
    student: MergedStudent,
    controlActionConfigs: ControlActionConfig[],
    controlActions: ControlAction[],
    options: PutMarksOptions
) {
    let updated = 0;
    let failed = 0;

    const marks = [];
    for (const config of controlActionConfigs) {
        const controlAction = getSuitableControlAction(config, controlActions);
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
            if (options.save) {
                debugger
                // await brsApi.putStudentMarkAsync(
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
    if (options.verbose || failed > 0) {
        const studentName = (
            student.actual.fullName + '                              '
        ).substr(0, 30);
        logger.log(
            `${status} ${studentName} updated: ${updated}, failed: ${failed}, marks: ${marks.join(
                ' '
            )}`
        );
    }
    return status;
}

function getSuitableControlAction(
    config: ControlActionConfig,
    controlActions: ControlAction[]
) {
    const suitableControlActions = controlActions.filter(a =>
        config.controlActions.some(b => compareNormalized(a.controlAction, b))
    );

    if (suitableControlActions.length === 0) {
        logger.log(`All of ${config.controlActions.join(', ')} not found`);
        logger.log(
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
            logger.log(
                `Invalid configuration of ${config.controlActions.join(', ')}`
            );
            logger.log(
                `Can't match: ${config.matchIndex}/${config.matchCount} of ${suitableControlActions.length}`
            );
            return null;
        }
        return suitableControlActions[config.matchIndex];
    }

    if (suitableControlActions.length > 1) {
        logger.log(
            `Several control actions found for ${config.controlActions.join(', ')}`
        );
        logger.log(
            `Found actions: ${suitableControlActions
                .map(a => a.controlAction)
                .join(', ')}`
        );
        return null;
    }

    return suitableControlActions[0];
}

function mergeStudents(
    actualStudents: ActualStudent[],
    brsStudents: StudentMark[],
    options: PutMarksOptions
) {
    const activeBrsStudents = brsStudents.filter(isStudentActive);

    const mergedStudents: MergedStudent[] = [];
    const skippedActualStudents: ActualStudent[] = [];
    for (const actualStudent of actualStudents) {
        if (options.cancelPending)
            break;
        const suitableStudents = activeBrsStudents.filter(brsStudent =>
            areStudentsLike(brsStudent, actualStudent)
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

function logMergedStudents(
    mergedStudents: MergedStudent[],
    skippedActualStudents: ActualStudent[],
    skippedBrsStudents: StudentMark[]
) {
    logger.log(`Merged students = ${mergedStudents.length}`);
    logger.log(`Can't merge actual students = ${skippedActualStudents.length}`);
    for (const s of skippedActualStudents) {
        logger.log('- ' + s.fullName);
    }
    logger.log(`Can't merge BRS students = ${skippedBrsStudents.length}`);
    for (const s of skippedBrsStudents) {
        logger.log('- ' + s.studentFio);
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
    cancelPending: boolean;
}

interface MergedStudent {
    actual: ActualStudent;
    brs: StudentMark;
}
