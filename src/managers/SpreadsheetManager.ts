import { StudentFailure, TermType } from "../apis/BrsApi";
import { ControlActionConfig } from "./MarksManager";
import * as googleApi from "../apis/GoogleApi";
import {
  compareNormalized,
  getKeys,
  filterNull,
  normalizeString,
} from "../helpers/tools";
import { parseStudentFailure } from "../helpers/brsHelpers";

export interface ActualStudent {
  fullName: string;
  groupName: string;
  id: string | null;
  failure: StudentFailure | null;
  properties: string[];
}

export interface SpreadsheetDatas {
  datas: SpreadsheetData[];
}

export interface SpreadsheetData {
  actualStudents: ActualStudent[];
  disciplineConfig: DisciplineConfig;
  controlActionConfigs: ControlActionConfig[];
}

export interface DisciplineConfig {
  name: string;
  year: number;
  termType: number;
  course: number;
  isModule: boolean;
  defaultStudentFailure: StudentFailure;
}

type DisciplineConfigErrors = {
  [key in keyof DisciplineConfig]: string | null;
};

export default class SpreadsheetManager {
  private readonly spreadsheetId: string;

  constructor(spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId;
  }

  async getSpreadsheetDataAsync(sheetName: string): Promise<SpreadsheetDatas> {
    const rows = await readRowsFromSpreadsheetAsync(
      this.spreadsheetId,
      sheetName
    );
    const header = getHeader(rows);

    const indices = buildIndicesBy(header);
    const dataRange = buildDataRange(sheetName, indices);
    const controlActionConfigs = buildControlActionConfig(header, indices);
    const disciplineConfig = buildDisciplineConfig(rows, indices);

    const actualStudents = await readStudentsAsync(
      this.spreadsheetId,
      dataRange,
      indices.fullNameColumn - indices.left,
      indices.groupColumn - indices.left,
      null,
      indices.failureColumn - indices.left
    );

    return {
      datas: [{ actualStudents, disciplineConfig, controlActionConfigs }],
    };
  }
}

async function readStudentsAsync(
  spreadsheetId: string,
  readRange: string,
  fullNameIndex: number = 0,
  groupNameIndex: number = 1,
  idIndex: number | null = null,
  failureIndex: number | null = null
) {
  const sheet = googleApi.getSpreadsheet(spreadsheetId);

  const rows = (await sheet.readAsync(readRange)).values || [];

  const result: ActualStudent[] = [];
  for (const row of rows) {
    const fullName = row[fullNameIndex];
    const groupName = row[groupNameIndex];
    const id = idIndex !== null ? row[idIndex] : null;
    const failure =
      failureIndex !== null ? parseStudentFailure(row[failureIndex]) : null;
    if (fullName && groupName) {
      result.push({
        fullName,
        groupName,
        id: id,
        failure: failure,
        properties: row,
      });
    }
  }
  return result;
}

async function readRowsFromSpreadsheetAsync(
  spreadsheetId: string,
  sheetName: string
) {
  const sheet = googleApi.getSpreadsheet(spreadsheetId);
  const rows = (await sheet.readAsync(sheetName + "!A1:ZZ100"))
    .values as string[][];
  return rows || null;
}

function getHeader(rows: string[][]) {
  const header = rows && rows[0];
  if (!header) throw new Error(`Лист Google-таблицы не содержит строк`);
  return header;
}

function buildIndicesBy(header: string[]): Indices {
  const defaultGroupColumnName = "Группа в БРС";
  const defaultFullNameColumnName = "Фамилия Имя в БРС";
  const defaultFailureColumnName = "Причина отсутствия";
  const disciplineParameterKeyColumnPrefix = "Названия параметров";
  const disciplineParameterValueColumnPrefix = "Значения параметров";

  const normalizedHeader = header && header.map((s) => normalizeString(s));
  const groupColumnIndex = normalizedHeader.indexOf(
    normalizeString(defaultGroupColumnName)
  );
  const fullNameColumnIndex = normalizedHeader.indexOf(
    normalizeString(defaultFullNameColumnName)
  );
  const failureColumnIndex = normalizedHeader.indexOf(
    normalizeString(defaultFailureColumnName)
  );
  const disciplineParameterKeyColumnIndex = normalizedHeader.indexOf(
    normalizeString(disciplineParameterKeyColumnPrefix)
  );
  const disciplineParameterValueColumnIndex = normalizedHeader.indexOf(
    normalizeString(disciplineParameterValueColumnPrefix)
  );

  if (
    failureColumnIndex < 0 ||
    groupColumnIndex < 0 ||
    fullNameColumnIndex < 0 ||
    groupColumnIndex > failureColumnIndex ||
    fullNameColumnIndex > failureColumnIndex ||
    Math.abs(fullNameColumnIndex - groupColumnIndex) !== 1 ||
    disciplineParameterKeyColumnIndex < 0 ||
    disciplineParameterValueColumnIndex < 0 ||
    disciplineParameterKeyColumnIndex <= failureColumnIndex ||
    disciplineParameterValueColumnIndex <= failureColumnIndex ||
    disciplineParameterValueColumnIndex !==
      disciplineParameterKeyColumnIndex + 1
  )
    throw new Error(`Неправильный порядок столбцов`);
  const leftIndex = Math.min(groupColumnIndex, fullNameColumnIndex);
  const rightIndex = failureColumnIndex;

  return {
    groupColumn: groupColumnIndex,
    fullNameColumn: fullNameColumnIndex,
    failureColumn: failureColumnIndex,
    disciplineKeyColumn: disciplineParameterKeyColumnIndex,
    disciplineValueColumn: disciplineParameterValueColumnIndex,
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
      index === indices.failureColumn ||
      !header[index]
    ) {
      continue;
    }
    controlActionConfigs.push({
      controlAction: header[index],
      propertyIndex: index - indices.left,
    });
  }

  for (const config of controlActionConfigs) {
    const sameColumns = controlActionConfigs.filter((c) =>
      compareNormalized(c.controlAction, config.controlAction)
    );
    if (sameColumns.length > 1) {
      config.matchCount = sameColumns.length;
      for (let matchIndex = 0; matchIndex < sameColumns.length; matchIndex++) {
        sameColumns[matchIndex].matchIndex = matchIndex;
      }
    }
  }

  return controlActionConfigs;
}

function buildDisciplineConfig(rows: string[][], indices: Indices) {
  const result: DisciplineConfig = {
    name: "",
    year: 0,
    termType: TermType.Fall,
    course: 1,
    isModule: false,
    defaultStudentFailure: StudentFailure.NoFailure,
  };
  const errors: DisciplineConfigErrors = {
    name: "Дисциплина",
    year: "Учебный год",
    termType: "Семестр",
    course: "Курс",
    isModule: "ИТС",
    defaultStudentFailure: "Причина отсутствия по умолчанию",
  };

  for (let i = 0; i < rows.length; i++) {
    const key = rows[i][indices.disciplineKeyColumn]?.trim();
    if (!key) {
      break;
    }
    const value = rows[i][indices.disciplineValueColumn]?.trim();
    addDisciplineConfigParameter(result, errors, key, value);
  }

  const errorNames = filterNull(getKeys(errors).map((k) => errors[k]));
  if (errorNames.length > 0) {
    const errorNamesString = errorNames.map((n) => `«${n}»`).join(", ");
    throw new Error(
      `Следующие параметры дисциплины не заданы: ${errorNamesString}`
    );
  }

  return result;
}

function addDisciplineConfigParameter(
  config: DisciplineConfig,
  errors: DisciplineConfigErrors,
  key: string,
  value: string
) {
  if (compareNormalized(key, "Дисциплина")) {
    if (value) {
      config.name = value;
      errors.name = null;
    }
  } else if (compareNormalized(key, "ИТС")) {
    if (value) {
      config.isModule = value.toLowerCase() === "да";
      errors.isModule = null;
    }
  } else if (compareNormalized(key, "Год")) {
    if (value) {
      config.year = parseInt(value.toLowerCase(), 10);
      errors.year = null;
    }
  } else if (compareNormalized(key, "Учебный год")) {
    if (value) {
      const yearParts = value.toLowerCase().split("/");
      config.year = parseInt(yearParts[0], 10);
      errors.year = null;
    }
  } else if (compareNormalized(key, "Семестр")) {
    if (value) {
      if (value.toLowerCase() === "осенний") {
        config.termType = TermType.Fall;
        errors.termType = null;
      } else if (value.toLowerCase() === "весенний") {
        config.termType = TermType.Spring;
        errors.termType = null;
      }
    }
  } else if (compareNormalized(key, "Курс")) {
    if (value) {
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === "все курсы") {
        config.course = 0;
        errors.course = null;
      } else {
        config.course = parseInt(value.toLowerCase(), 10);
        errors.course = null;
      }
    }
  } else if (compareNormalized(key, "Причина отсутствия по умолчанию")) {
    config.defaultStudentFailure =
      parseStudentFailure(value) ?? StudentFailure.NoFailure;
    errors.defaultStudentFailure = null;
  }
}

interface Indices {
  groupColumn: number;
  fullNameColumn: number;
  failureColumn: number;
  disciplineKeyColumn: number;
  disciplineValueColumn: number;
  left: number;
  right: number;
}
