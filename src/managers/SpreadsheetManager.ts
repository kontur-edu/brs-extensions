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
import { emojiRegex } from "../helpers/emojiRegex";

export interface ActualStudent {
  fullName: string;
  groupName: string | null;
  course: number | null;
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

    const actualStudents = await readStudentsAsync(
      this.spreadsheetId,
      dataRange,
      indices
    );

    if (
      indices.disciplineKeyColumn >= 0 &&
      indices.disciplineValueColumn >= 0
    ) {
      // Получение параметров из таблицы ключей и значений
      const controlActionConfigs = buildControlActionConfig(header, indices);
      const disciplineConfig = buildDisciplineConfig(rows, indices);
      return {
        datas: [{ actualStudents, disciplineConfig, controlActionConfigs }],
      };
    } else if (indices.courseColumn >= 0 || indices.academicGroupColumn >= 0) {
      // Получение параметров из заголовка таблицы
      const controlActionConfigs = buildControlActionConfig(header, indices);
      const studentGroups: { [course: number]: ActualStudent[] } = {};
      for (const student of actualStudents) {
        if (student.course !== null) {
          if (!studentGroups[student.course]) {
            studentGroups[student.course] = [];
          }
          studentGroups[student.course].push(student);
        }
      }

      const courses = getKeys(studentGroups);
      const disciplineConfigs =
        await buildDisciplineConfigFromSpreadsheetTitleAsync(
          this.spreadsheetId,
          courses
        );

      const datas = disciplineConfigs.map((config) => ({
        actualStudents: studentGroups[config.course],
        disciplineConfig: config,
        controlActionConfigs,
      }));

      return {
        datas,
      };
    } else {
      throw new Error(`Некорректная структура входной таблицы`);
    }
  }
}

async function readStudentsAsync(
  spreadsheetId: string,
  readRange: string,
  indices: Indices
) {
  const fullNameIndex =
    indices.fullNameColumn >= 0 ? indices.fullNameColumn - indices.left : null;
  const surnameIndex =
    indices.surnameColumn >= 0 ? indices.surnameColumn - indices.left : null;
  const nameIndex =
    indices.nameColumn >= 0 ? indices.nameColumn - indices.left : null;
  const patronymicIndex =
    indices.patronymicColumn >= 0
      ? indices.patronymicColumn - indices.left
      : null;
  const groupNameIndex =
    indices.groupColumn >= 0 ? indices.groupColumn - indices.left : null;
  const courseIndex =
    indices.courseColumn >= 0 ? indices.courseColumn - indices.left : null;
  const academicGroupIndex =
    indices.academicGroupColumn >= 0
      ? indices.academicGroupColumn - indices.left
      : null;
  const idIndex = null;
  const failureIndex = indices.failureColumn - indices.left;

  const sheet = googleApi.getSpreadsheet(spreadsheetId);
  const rows = (await sheet.readAsync(readRange)).values || [];

  const result: ActualStudent[] = [];
  for (const row of rows) {
    const fullName1 = fullNameIndex !== null ? row[fullNameIndex].trim() : null;
    const surname = surnameIndex !== null ? row[surnameIndex] : null;
    const name = nameIndex !== null ? row[nameIndex] : null;
    const patronymic = patronymicIndex !== null ? row[patronymicIndex] : null;
    const fullName2 =
      surname !== null && surname.length > 0
        ? `${surname.trim()} ${name?.trim() ?? ""} ${
            patronymic?.trim() ?? ""
          }`.trim()
        : null;
    const fullName =
      fullName1 !== null && fullName1.length > 0 ? fullName1 : fullName2;

    const groupName = groupNameIndex !== null ? row[groupNameIndex] : null;

    const course1 = courseIndex !== null ? row[courseIndex] : null;
    const academicGroup =
      academicGroupIndex !== null ? row[academicGroupIndex] : null;
    const course2 = academicGroup?.match(/\d/)?.[0];
    const course = course1 !== null && course1.length > 0 ? course1 : course2;

    const id = idIndex !== null ? row[idIndex] : null;
    const failure =
      failureIndex !== null ? parseStudentFailure(row[failureIndex]) : null;
    if (fullName !== null && fullName.length > 0) {
      result.push({
        fullName: fullName,
        groupName,
        id: id,
        course,
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

async function readTitleFromSpreadsheetAsync(spreadsheetId: string) {
  const sheet = googleApi.getSpreadsheet(spreadsheetId);
  return (await sheet.getMetaAsync()).properties.title;
}

function getHeader(rows: string[][]) {
  const header = rows && rows[0];
  if (!header) throw new Error(`Лист Google-таблицы не содержит строк`);
  return header;
}

function buildIndicesBy(header: string[]): Indices {
  const defaultGroupColumnName = "Группа в БРС";
  const defaultFullNameColumnName = "Фамилия Имя в БРС";
  const defaultSurnameColumnName = "Фамилия";
  const defaultNameColumnName = "Имя";
  const defaultPatronymicColumnName = "Отчество";
  const defaultCourseColumnName = "Год обучения";
  const defaultAcademicGroupColumnName = "Группа";
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
  const surnameColumnIndex = normalizedHeader.indexOf(
    normalizeString(defaultSurnameColumnName)
  );
  const nameColumnIndex = normalizedHeader.indexOf(
    normalizeString(defaultNameColumnName)
  );
  const patronymicColumnIndex = normalizedHeader.indexOf(
    normalizeString(defaultPatronymicColumnName)
  );
  const courseColumnIndex = normalizedHeader.indexOf(
    normalizeString(defaultCourseColumnName)
  );
  const academicGroupColumnIndex = normalizedHeader.indexOf(
    normalizeString(defaultAcademicGroupColumnName)
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
    (fullNameColumnIndex < 0 && surnameColumnIndex < 0) ||
    fullNameColumnIndex >= failureColumnIndex ||
    surnameColumnIndex >= failureColumnIndex ||
    nameColumnIndex >= failureColumnIndex ||
    patronymicColumnIndex >= failureColumnIndex ||
    (groupColumnIndex >= 0 && groupColumnIndex > failureColumnIndex) ||
    (courseColumnIndex >= 0 && courseColumnIndex > failureColumnIndex) ||
    (academicGroupColumnIndex >= 0 &&
      academicGroupColumnIndex > failureColumnIndex) ||
    (disciplineParameterKeyColumnIndex >= 0 &&
      disciplineParameterKeyColumnIndex <= failureColumnIndex) ||
    (disciplineParameterValueColumnIndex >= 0 &&
      disciplineParameterValueColumnIndex <= failureColumnIndex) ||
    (disciplineParameterKeyColumnIndex >= 0 &&
      disciplineParameterValueColumnIndex !==
        disciplineParameterKeyColumnIndex + 1)
  )
    throw new Error(`Неправильный порядок столбцов`);

  const leftIndex = Math.min(
    ...[
      fullNameColumnIndex,
      surnameColumnIndex,
      nameColumnIndex,
      patronymicColumnIndex,
      groupColumnIndex,
      courseColumnIndex,
      academicGroupColumnIndex,
    ].filter((it) => it >= 0)
  );
  const rightIndex = failureColumnIndex;

  return {
    groupColumn: groupColumnIndex,
    fullNameColumn: fullNameColumnIndex,
    surnameColumn: surnameColumnIndex,
    nameColumn: nameColumnIndex,
    patronymicColumn: patronymicColumnIndex,
    courseColumn: courseColumnIndex,
    academicGroupColumn: academicGroupColumnIndex,
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
      index === indices.courseColumn ||
      index === indices.academicGroupColumn ||
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

async function buildDisciplineConfigFromSpreadsheetTitleAsync(
  spreadsheetId: string,
  courses: number[]
): Promise<DisciplineConfig[]> {
  const spreadsheetTitle = await readTitleFromSpreadsheetAsync(spreadsheetId);

  const prepared = spreadsheetTitle.replaceAll(emojiRegex, "").trim();
  const commaIndex = prepared.lastIndexOf(",");
  const name = prepared.substring(0, commaIndex).trim();
  const time = prepared.substring(commaIndex + 1).trim();
  const timeParts = time.split(" ");
  const termType = compareNormalized(timeParts[0], "весна")
    ? TermType.Spring
    : TermType.Fall;
  const year =
    parseInt(timeParts[1], 10) + (termType === TermType.Spring ? -1 : 0);

  const configs = courses.map((it) => ({
    name,
    year,
    termType,
    course: it,
    isModule: true,
    defaultStudentFailure: StudentFailure.NoFailure,
  }));

  return configs;
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
  surnameColumn: number;
  nameColumn: number;
  patronymicColumn: number;
  courseColumn: number;
  academicGroupColumn: number;
  failureColumn: number;
  disciplineKeyColumn: number;
  disciplineValueColumn: number;
  left: number;
  right: number;
}
