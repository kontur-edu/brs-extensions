import "bluebird";
import request from "request-promise";
import * as cache from "../helpers/cache";
import { StorageType } from "../helpers/cache";
import BrsAuth from "./BrsAuth";
import BrsUrlProvider from "./BrsUrlProvider";
import CustomError, { StatusCode } from "../helpers/CustomError";

export enum StudentFailure {
  /** -, дефис, все хорошо */ NoFailure = -1,
  /** Не выбрана */ NotChosen = -19,
  /** Не допущен (деканат) */ NotAllowedByDeansOffice = -18,
  /** Не явился */ NotAppeared = 0,
  /** Неуважительная */ DisrespectfulReason = 12,
  /** Уважительная */ RespectfulReason = 13,
  /** Не допущен */ NotAllowedByTeacher = 18,
  /** Не должен сдавать */ ShouldNotPass = 19,
  /** Академический отпуск */ AcademicLeave = 20,
  /** Выбыл */ DroppedOut = 21,
}

export enum TermType {
  Fall = 1,
  Spring = 2,
}

export default class BrsApi {
  readonly brsAuth: BrsAuth;
  private readonly brsUrlProvider: BrsUrlProvider;

  constructor(brsAuth: BrsAuth, brsUrlProvider: BrsUrlProvider) {
    this.brsAuth = brsAuth;
    this.brsUrlProvider = brsUrlProvider;
  }

  async getDisciplineCachedAsync(
    year: number,
    termType: TermType,
    course: number,
    isModule: boolean
  ) {
    const cacheName = this.getDisciplineCacheName(
      year,
      termType,
      course,
      isModule
    );
    const cacheResult = cache.read<Discipline[]>(cacheName, StorageType.Session);
    if (cacheResult) {
      return cacheResult;
    }

    const total = await this.getDisciplineTotalAsync(
      year,
      termType,
      course,
      isModule
    );
    const result = await this.getDisciplineInternalAsync(
      year,
      termType,
      course,
      isModule,
      total
    );
    cache.save(cacheName, result, StorageType.Session);
    return result;
  }

  async getDisciplineInternalAsync(
    year: number,
    termType: TermType,
    course: number,
    isModule: boolean,
    total: number
  ) {
    const queryString = `?year=${year}&termType=${termType}&course=${course}&total=${total}&page=1&pageSize=${total}&search=`;
    if (isModule) {
      const paging = await this.requestApiJsonAsync<Paging<Discipline>>(
        "/mvc/mobile/module/fetch" + queryString
      );
      const disciplines = paging.content;
      for (const d of disciplines) {
        d.isModule = true;
      }
      return disciplines;
    } else {
      const paging = await this.requestApiJsonAsync<Paging<Discipline>>(
        "/mvc/mobile/discipline/fetch" + queryString
      );
      const disciplines = paging.content;
      for (const d of disciplines) {
        d.isModule = false;
      }
      return disciplines;
    }
  }

  async clearDisciplineCacheAsync(
    year: number,
    termType: TermType,
    course: number,
    isModule: boolean
  ) {
    const cacheName = this.getDisciplineCacheName(
      year,
      termType,
      course,
      isModule
    );
    cache.clear(cacheName, StorageType.Session);
  }

  async getDisciplineTotalAsync(
    year: number,
    termType: TermType,
    course: number,
    isModule: boolean
  ) {
    const moduleParameter = isModule ? "&its=true" : "";
    const queryString =
      `?year=${year}&termType=${termType}&course=${course}` + moduleParameter;
    const total = await this.requestApiJsonAsync<number>(
      "/mvc/mobile/discipline/amount" + queryString
    );
    return total;
  }

  async getAllStudentMarksAsync(discipline: Discipline) {
    const students = [
      ...(await this.getStudentMarksAsync(discipline, "lecture", "current")),
      ...(await this.getStudentMarksAsync(
        discipline,
        "lecture",
        "intermediate"
      )),
      ...(await this.getStudentMarksAsync(discipline, "laboratory", "current")),
      ...(await this.getStudentMarksAsync(
        discipline,
        "laboratory",
        "intermediate"
      )),
    ];

    const uniqueStudents: { [id: string]: StudentMark } = {};
    for (const s of students) {
      const knownStudent = uniqueStudents[s.studentUuid] || {};
      uniqueStudents[s.studentUuid] = { ...knownStudent, ...s };
    }

    return Object.keys(uniqueStudents).map((k) => uniqueStudents[k]);
  }

  async getStudentMarksAsync(
    discipline: Discipline,
    cardType: CardType,
    markType: MarkType
  ) {
    return this.getStudentMarksInternalAsync(
      discipline.disciplineLoad,
      discipline.isModule,
      discipline.groupHistoryId,
      discipline.groupId,
      cardType,
      markType
    );
  }

  async getStudentMarksInternalAsync(
    disciplineLoad: string,
    isModule: boolean,
    groupUuid: string,
    techgroup: string,
    cardType: CardType,
    markType: MarkType,
    isTotal: boolean = false,
    showActiveStudents: boolean = false
  ) {
    const groupPart = isModule
      ? `techgroup=${techgroup}`
      : `groupUuid=${groupUuid}`;
    return this.requestApiJsonAsync<StudentMark[]>(
      `/mvc/mobile/studentMarks/fetch?disciplineLoad=${disciplineLoad}&${groupPart}` +
        `&cardType=${cardType}&hasTest=false&isTotal=${isTotal}` +
        `&intermediate=${markType === "intermediate"}` +
        `&selectedTeachers=null&showActiveStudents=${showActiveStudents}`
    );
  }

  async getAllControlActionsCachedAsync(discipline: Discipline) {
    return [
      ...(await this.getControlActionsCachedAsync(
        discipline,
        "lecture",
        "current"
      )),
      ...(await this.getControlActionsCachedAsync(
        discipline,
        "lecture",
        "intermediate"
      )),
      ...(await this.getControlActionsCachedAsync(
        discipline,
        "laboratory",
        "current"
      )),
      ...(await this.getControlActionsCachedAsync(
        discipline,
        "laboratory",
        "intermediate"
      )),
      ...(await this.getControlActionsCachedAsync(
        discipline,
        "practice",
        "current"
      )),
      ...(await this.getControlActionsCachedAsync(
        discipline,
        "practice",
        "intermediate"
      )),
      ...(await this.getControlActionsCachedAsync(
        discipline,
        "additionalPractice",
        "current"
      )),
      ...(await this.getControlActionsCachedAsync(
        discipline,
        "additionalPractice",
        "intermediate"
      )),
    ];
  }

  async getControlActionsCachedAsync(
    discipline: Discipline,
    cardType: CardType,
    markType: MarkType
  ) {
    const cacheName =
      `${this.brsAuth.safeUserName}_getControlActions_${discipline.disciplineLoad}` +
      `_${discipline.isModule}_${discipline.groupHistoryId}_${discipline.groupId}_${cardType}_${markType}`;
    const cacheResult = cache.read<ControlAction[]>(
      cacheName,
      StorageType.Session
    );
    if (cacheResult) {
      return cacheResult;
    }

    const result = await this.getControlActionsInternalAsync(
      discipline.disciplineLoad,
      discipline.isModule,
      discipline.groupHistoryId,
      discipline.groupId,
      cardType,
      markType
    );
    cache.save(cacheName, result, StorageType.Session);
    return result;
  }

  async getControlActionsInternalAsync(
    disciplineLoad: string,
    isModule: boolean,
    groupUuid: string,
    techgroup: string,
    cardType: CardType,
    markType: MarkType
  ) {
    const modulePart = isModule ? "/module" : "";
    const groupPart = isModule ? techgroup : groupUuid;
    const response = await this.requestApiAsync<string>(
      `/mvc/mobile/view/mark/${disciplineLoad}/${groupPart}/teachers${modulePart}/${cardType}/${markType}`
    );

    const prefix = "gridColumns = toTextArray(";
    const suffix = ");";
    const linesWithId = response
      .split("\r\n")
      .map((s) => s.trim())
      .filter((s) => s.startsWith(prefix));
    if (linesWithId.length !== 1) {
      throw new Error(
        "Не удалось разобрать страницу БРС со списком контрольных мероприятий. Ожидается, что эта страница содержит единственную строчку с идентификатором техкарты."
      );
    }

    const columns: Array<{ controlAction: string; uuid: string }> =
      JSON.parse(
        linesWithId[0].substr(
          prefix.length,
          linesWithId[0].length - prefix.length - suffix.length
        )
      ) || [];

    const uuidPrefix = "technologyCard";
    const result = columns
      .filter((c) => c.uuid && c.uuid.startsWith(uuidPrefix))
      .map((c) => ({
        uuid: c.uuid,
        uuidWithoutPrefix: c.uuid.substr(uuidPrefix.length),
        controlAction: c.controlAction,
      }));
    return result as ControlAction[];
  }

  async putStudentMarkAsync(
    studentUuid: string,
    controlActionId: string,
    mark: number,
    groupId: string,
    cardTypeKey: CardType,
    disciplineLoadUuid: string
  ) {
    const body = `student=${studentUuid}&techcard=${controlActionId}&mark=${
      isNaN(mark) ? "" : mark.toString()
    }&groupId=${groupId}&cardTypeKey=${cardTypeKey}&disciplineLoadUuid=${disciplineLoadUuid}`;
    return this.requestApiJsonAsync<StudentMark>(
      `/mvc/mobile/studentMarks/put`,
      {
        method: "POST",
        body,
        json: false,
      },
      {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      }
    );
  }

  async putStudentFailureAsync(
    studentUuid: string,
    discipline: Discipline,
    studentFailure: StudentFailure = StudentFailure.NoFailure,
    cardType: CardType = "lecture"
  ) {
    const body = `markFailure=${studentFailure}&cardType=${cardType}&disciplineLoad=${discipline.disciplineLoad}&studentId=${studentUuid}`;
    await this.requestApiAsync(
      `/mvc/mobile/failure/update`,
      {
        method: "POST",
        body,
        json: false,
      },
      {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      }
    );
  }

  async updateAllMarksAsync(discipline: Discipline) {
    // Одного вызова достаточно, чтобы обновить все оценки по предмету у группы.
    await this.updateMarksAsync(discipline, "lecture", "intermediate");
    // await updateMarksAsync(discipline, 'lecture', 'current');
    // await updateMarksAsync(discipline, 'lecture', 'intermediate');
    // await updateMarksAsync(discipline, 'laboratory', 'current');
    // await updateMarksAsync(discipline, 'laboratory', 'intermediate');
    // await updateMarksAsync(discipline, 'practice', 'current');
    // await updateMarksAsync(discipline, 'practice', 'intermediate');
  }

  async updateMarksAsync(
    discipline: Discipline,
    cardType: CardType,
    markType: MarkType
  ) {
    return this.updateMarksInternalAsync(
      discipline.disciplineLoad,
      discipline.isModule,
      discipline.groupHistoryId,
      discipline.groupId,
      cardType,
      markType
    );
  }

  async updateMarksInternalAsync(
    disciplineLoad: string,
    isModule: boolean,
    groupUuid: string,
    techgroup: string,
    cardType: CardType,
    markType: MarkType
  ) {
    const modulePart = isModule ? "/module" : "";
    const groupPart = isModule
      ? `techgroup=${techgroup}`
      : `groupUuid=${groupUuid}`;
    const body =
      `disciplineLoad=${disciplineLoad}&${groupPart}` +
      `&cardType=${cardType}&hasTest=false&isTotal=false` +
      `&intermediate=${markType === "intermediate"}` +
      `&selectedTeachers=null&showActiveStudents=true`;
    return this.requestApiAsync<string>(
      `/mvc/mobile/updateMarks${modulePart}`,
      {
        method: "POST",
        body,
        json: false,
      },
      {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      }
    );
  }

  getDisciplineCacheName(
    year: number,
    termType: TermType,
    course: number,
    isModule: boolean
  ) {
    return `${this.brsAuth.safeUserName}_getDiscipline_${year}_${termType}_${course}_${isModule}`;
  }

  async requestApiJsonAsync<T>(
    uri: string,
    options?: RequestOptions,
    headers?: RequestHeaders
  ): Promise<T> {
    const response = await this.requestApiAsync<string>(uri, options, headers);

    return JSON.parse(response);
  }

  async requestApiAsync<T>(
    uri: string,
    options?: RequestOptions,
    headers?: RequestHeaders
  ): Promise<T> {
    const response = await request({
      method: "GET",
      ...options,
      url: this.brsUrlProvider.baseUrl + uri,
      headers: {
        "X-Cookie": `JSESSIONID=${this.brsAuth.sid}`,
        "X-Requested-With": "XMLHttpRequest",
        ...headers,
      },
    });

    if (response.trimLeft().startsWith("<!DOCTYPE html>")) {
      throw new CustomError(StatusCode.BrsUnauthorized, uri + " is Forbidden");
    }

    return response;
  }
}

export type CardType =
  | "lecture"
  | "laboratory"
  | "practice"
  | "additionalPractice";
export type MarkType = "intermediate" | "current";

export interface RegisterInfo {
  registerInfoStr: string;
  registerId: number;
  passDate: any;
  cardType: string;
  sheet: string;
}

export interface Discipline {
  groupId: string;
  discipline: string;
  group: string;
  registerInfo: RegisterInfo[];
  disciplineLoad: string;
  groupHistoryId: string;
  isModule: boolean;
}

// eslint-disable-next-line
const studentMarkSample: StudentMark = {
  studentPersonalNumber: "09800106",
  isEdit: false,
  studentUuid:
    "studen18hc2jg0000magk6mi3iec84bsundigr18hc2jg0000m53o7mlgvora278",
  status: 1,
  studentStatus: "Активный",
  ignoreCurrentDebars: false,
  studentFio: "Анисимова Маргарита Васильевна",
  isExtern: false,
  teacherName: "",
  cardType: "lecture",
  studentName: "Анисимова М.В.",
  studentGroup: "РИ-180001",
  registerClosed: false,
  subgroupsITS: "",
  disciplineLoad: "unpldd18hc2jg0000m5kojcd3te76bnk",
};

export interface StudentMark {
  studentPersonalNumber: string;
  isEdit: boolean;
  studentUuid: string;
  status: number;
  studentStatus: string;
  ignoreCurrentDebars: boolean;
  studentFio: string;
  isExtern: boolean;
  teacherName: string;
  cardType: CardType;
  studentName: string;
  studentGroup: string;
  registerClosed: boolean;
  subgroupsITS: string;
  disciplineLoad: string;
  failure?: StudentFailure;
  failureName?: string;

  [props: string]: number | string | boolean | undefined;
}

export interface ControlAction {
  uuid: string;
  uuidWithoutPrefix: string;
  controlAction: string;
}

interface RequestOptions {
  method?: string;
  body?: object | string;
  json?: boolean;
}

interface RequestHeaders {
  "Content-Type"?: string;
}

interface Paging<T> {
  content: T[];
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  sort: any;
  first: boolean;
  numberOfElements: number;
}
