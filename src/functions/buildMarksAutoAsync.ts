import {Discipline, TermType} from "../apis/brsApi";
import {ControlActionConfig, DisciplineConfig, PutMarksOptions,} from "./putMarksToBrsAsync";
import * as readStudents from "./readStudentsAsync";
import {ActualStudent} from "./readStudentsAsync";
import * as googleApi from "../apis/googleApi";
import {compareNormalized, normalizeString} from "../helpers/tools";

export type {
    DisciplineConfig,
    ControlActionConfig,
    PutMarksOptions,
} from "./putMarksToBrsAsync";

export default async function buildMarksAutoAsync(
    spreadsheetId: string,
    sheetName: string,
    isSuitableDiscipline: ((d: Discipline) => boolean) | null = null,
    isSuitableActualStudent: ((s: ActualStudent) => boolean) | null = null,
): Promise<MarksData> {
    const header = await readHeaderFromSpreadsheetAsync(
        spreadsheetId,
        sheetName,
    );

    const indices = buildIndicesBy(header);
    const dataRange = buildDataRange(sheetName, indices);
    const controlActionConfigs = buildControlActionConfig(header, indices);
    const disciplineConfig = buildDisciplineConfig(
        header,
        indices,
        isSuitableDiscipline
    );

    const allActualStudents = await readStudents.fromSpreadsheetAsync(
        spreadsheetId,
        dataRange,
        indices.fullNameColumn - indices.left,
        indices.groupColumn - indices.left,
        null,
    );
    const actualStudents = isSuitableActualStudent
        ? allActualStudents.filter(isSuitableActualStudent)
        : allActualStudents;

    return {
        actualStudents,
        disciplineConfig,
        controlActionConfigs,
    }
}

async function readHeaderFromSpreadsheetAsync(
    spreadsheetId: string,
    sheetName: string,
) {
    await googleApi.authorizeAsync();
    const sheet = googleApi.getSpreadsheet(spreadsheetId);
    const rows = (await sheet.readAsync(sheetName + "!A1:ZZ1"))
        .values as string[][];
    const header = rows && rows[0];
    if (!header) {
        throw new Error(`Can't read header of spreadsheet`);
    }

    return header;
}

function buildIndicesBy(header: string[]): Indices {
    const defaultGroupColumnName = "Группа в БРС";
    const defaultFullNameColumnName = "Фамилия Имя в БРС";
    const disciplineColumnPrefix = "Дисциплина";

    const normalizedHeader = header && header.map((s) => normalizeString(s));
    const groupColumnIndex = normalizedHeader.indexOf(
        normalizeString(defaultGroupColumnName)
    );
    const fullNameColumnIndex = normalizedHeader.indexOf(
        normalizeString(defaultFullNameColumnName)
    );
    const disciplineColumnIndex = normalizedHeader.findIndex((s) =>
        s.startsWith(normalizeString(disciplineColumnPrefix))
    );

    const rightIndex = disciplineColumnIndex - 1;
    // Колонка с описанием дисциплины должна быть справа, колонки с именами и группами студентов должны быть слева.
    // Колонки с именами и группами студентов должны быть рядом.
    if (
        groupColumnIndex < 0 ||
        fullNameColumnIndex < 0 ||
        disciplineColumnIndex < 0 ||
        groupColumnIndex > rightIndex ||
        fullNameColumnIndex > rightIndex ||
        Math.abs(fullNameColumnIndex - groupColumnIndex) !== 1
    ) {
        throw new Error(`Wrong order of columns`);
    }

    const leftIndex = Math.min(groupColumnIndex, fullNameColumnIndex);

    return {
        groupColumn: groupColumnIndex,
        fullNameColumn: fullNameColumnIndex,
        disciplineColumn: disciplineColumnIndex,
        left: leftIndex,
        right: rightIndex,
    };
}

function buildDataRange(sheetName: string, indices: Indices) {
    const leftLetter = String.fromCharCode("A".charCodeAt(0) + indices.left);
    const rightLetter = String.fromCharCode("A".charCodeAt(0) + indices.right);
    return `${sheetName}!${leftLetter}2:${rightLetter}`;
}

function buildControlActionConfig(header: string[], indices: Indices) {
    const controlActionConfigs: ControlActionConfig[] = [];
    for (let index = indices.left; index <= indices.right; index++) {
        if (
            index === indices.groupColumn ||
            index === indices.fullNameColumn ||
            !header[index]
        ) {
            continue;
        }
        controlActionConfigs.push({
            controlActions: [header[index]],
            propertyIndex: index - indices.left,
        });
    }
    for (const config of controlActionConfigs) {
        if (config.controlActions.length === 1) {
            const sameColumns = controlActionConfigs.filter(
                (c) =>
                    c.controlActions.length === 1 &&
                    compareNormalized(c.controlActions[0], config.controlActions[0])
            );
            if (sameColumns.length > 1) {
                config.matchCount = sameColumns.length;
                for (
                    let matchIndex = 0;
                    matchIndex < sameColumns.length;
                    matchIndex++
                ) {
                    sameColumns[matchIndex].matchIndex = matchIndex;
                }
            }
        }
    }

    return controlActionConfigs;
}

function buildDisciplineConfig(
    header: string[],
    indices: Indices,
    isSuitableDiscipline: ((d: Discipline) => boolean) | null
) {
    const result = {} as DisciplineConfig;
    for (const part of header[indices.disciplineColumn].split(";")) {
        const keyValue = part.split(":").map((p) => p.trim());
        const normalizedKey = normalizeString(keyValue[0]);
        const value = keyValue[1];
        if (normalizedKey === normalizeString("Дисциплина")) {
            result.name = value;
        } else if (normalizedKey === normalizeString("ИТС")) {
            result.isModule = value.toLowerCase() === "да";
        } else if (normalizedKey === normalizeString("Год")) {
            result.year = parseInt(value.toLowerCase(), 10);
        } else if (normalizedKey === normalizeString("Семестр")) {
            if (value.toLowerCase() === "осенний") {
                result.termType = TermType.Fall;
            } else if (value.toLowerCase() === "весенний") {
                result.termType = TermType.Spring;
            }
        } else if (normalizedKey === normalizeString("Курс")) {
            result.course = parseInt(value.toLowerCase(), 10);
        }
    }
    result.isSuitableDiscipline = isSuitableDiscipline;

    return result;
}

interface Indices {
    groupColumn: number;
    fullNameColumn: number;
    disciplineColumn: number;
    left: number;
    right: number;
}

export interface MarksData {
    actualStudents: ActualStudent[];
    disciplineConfig: DisciplineConfig;
    controlActionConfigs: ControlActionConfig[];
}
