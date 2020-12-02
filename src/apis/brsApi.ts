import 'bluebird';
// import * as fs from 'fs';
import request from 'request-promise';
// import * as cache from '../helpers/cache';

const brsProxy = "https://brs-proxy.herokuapp.com"
const baseUrl = brsProxy + '/brs/https://brs.urfu.ru/mrd';
let globalSid: string | null = 'null';
let globalLogin: string | null = null;

export function setSid(sid: string) {
    globalSid = sid;
}

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

export async function getDisciplineCachedAsync(
    year: number,
    termType: TermType,
    course: number,
    isModule: boolean
) {
    const cacheName = `${globalLogin}_getDiscipline_${year}_${termType}_${course}_${isModule}`;
    const cacheResult = null;
    if (cacheResult) {
        return cacheResult;
    }

    const result = await getDisciplineInternalAsync(
        year,
        termType,
        course,
        isModule
    );
    // cache.save(cacheName, result);
    return result;
}

export async function getDisciplineInternalAsync(
    year: number,
    termType: TermType,
    course: number,
    isModule: boolean
) {
    const queryString = `?year=${year}&termType=${termType}&course=${course}&total=0&page=1&pageSize=1000&search=`;
    if (isModule) {
        const disciplines = await requestApiJsonAsync<Discipline[]>(
            '/mvc/mobile/module/fetch' + queryString
        );
        for (const d of disciplines) {
            d.isModule = true;
        }
        return disciplines;
    } else {
        const paging = await requestApiJsonAsync<Paging<Discipline>>(
            '/mvc/mobile/discipline/fetch' + queryString
        );
        const disciplines = paging.content;
        for (const d of disciplines) {
            d.isModule = false;
        }
        return disciplines;
    }
}

export async function getAllStudentMarksAsync(discipline: Discipline) {
    const students = [
        ...(await getStudentMarksAsync(discipline, 'lecture', 'current')),
        ...(await getStudentMarksAsync(discipline, 'lecture', 'intermediate')),
        ...(await getStudentMarksAsync(discipline, 'laboratory', 'current')),
        ...(await getStudentMarksAsync(discipline, 'laboratory', 'intermediate')),
    ];

    const uniqueStudents: { [id: string]: StudentMark } = {};
    for (const s of students) {
        const knownStudent = uniqueStudents[s.studentUuid] || {};
        uniqueStudents[s.studentUuid] = {...knownStudent, ...s};
    }

    return Object.keys(uniqueStudents).map(k => uniqueStudents[k]);
}

async function getStudentMarksAsync(
    discipline: Discipline,
    cardType: CardType,
    markType: MarkType
) {
    return getStudentMarksInternalAsync(
        discipline.disciplineLoad,
        discipline.isModule,
        discipline.groupHistoryId,
        discipline.groupId,
        cardType,
        markType
    );
}

async function getStudentMarksInternalAsync(
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
    return requestApiJsonAsync<StudentMark[]>(
        `/mvc/mobile/studentMarks/fetch?disciplineLoad=${disciplineLoad}&${groupPart}` +
        `&cardType=${cardType}&hasTest=false&isTotal=${isTotal}` +
        `&intermediate=${markType === 'intermediate'}` +
        `&selectedTeachers=null&showActiveStudents=${showActiveStudents}`
    );
}

export async function getAllControlActionsCachedAsync(discipline: Discipline) {
    return [
        ...(await getControlActionsCachedAsync(discipline, 'lecture', 'current')),
        ...(await getControlActionsCachedAsync(
            discipline,
            'lecture',
            'intermediate'
        )),
        ...(await getControlActionsCachedAsync(
            discipline,
            'laboratory',
            'current'
        )),
        ...(await getControlActionsCachedAsync(
            discipline,
            'laboratory',
            'intermediate'
        )),
        ...(await getControlActionsCachedAsync(discipline, 'practice', 'current')),
        ...(await getControlActionsCachedAsync(
            discipline,
            'practice',
            'intermediate'
        )),
        ...(await getControlActionsCachedAsync(
            discipline,
            'additionalPractice',
            'current'
        )),
        ...(await getControlActionsCachedAsync(
            discipline,
            'additionalPractice',
            'intermediate'
        )),
    ];
}

async function getControlActionsCachedAsync(
    discipline: Discipline,
    cardType: CardType,
    markType: MarkType
) {
    const cacheName = `${globalLogin}_getControlActions_${discipline.disciplineLoad}_${discipline.isModule}_${discipline.groupHistoryId}_${discipline.groupId}_${cardType}_${markType}`;
    const cacheResult = null//cache.read<ControlAction[]>(cacheName);
    if (cacheResult) {
        return cacheResult;
    }

    const result = await getControlActionsInternalAsync(
        discipline.disciplineLoad,
        discipline.isModule,
        discipline.groupHistoryId,
        discipline.groupId,
        cardType,
        markType
    );
    // cache.save(cacheName, result);
    return result;
}

async function getControlActionsInternalAsync(
    disciplineLoad: string,
    isModule: boolean,
    groupUuid: string,
    techgroup: string,
    cardType: CardType,
    markType: MarkType
) {
    const modulePart = isModule ? '/module' : '';
    const groupPart = isModule ? techgroup : groupUuid;
    const response = await requestApiAsync<string>(
        `/mvc/mobile/view/mark/${disciplineLoad}/${groupPart}/teachers${modulePart}/${cardType}/${markType}`
    );

    const prefix = 'gridColumns = toTextArray(';
    const suffix = ');';
    const linesWithId = response
        .split('\r\n')
        .map(s => s.trim())
        .filter(s => s.startsWith(prefix));
    if (linesWithId.length !== 1) {
        throw new Error(
            'Control actions page should contain single line target line with techcard identifier'
        );
    }

    const columns: Array<{ controlAction: string; uuid: string }> =
        JSON.parse(
            linesWithId[0].substr(
                prefix.length,
                linesWithId[0].length - prefix.length - suffix.length
            )
        ) || [];

    const uuidPrefix = 'technologyCard';
    const result = columns
        .filter(c => c.uuid && c.uuid.startsWith(uuidPrefix))
        .map(c => ({
            uuid: c.uuid,
            uuidWithoutPrefix: c.uuid.substr(uuidPrefix.length),
            controlAction: c.controlAction,
        }));
    return result as ControlAction[];
}

export async function putStudentMarkAsync(
    studentUuid: string,
    controlActionId: string,
    mark: number,
    groupId: string,
    cardTypeKey: CardType,
    disciplineLoadUuid: string
) {
    const body = `student=${studentUuid}&techcard=${controlActionId}&mark=${
        isNaN(mark) ? '' : mark.toString()
    }&groupId=${groupId}&cardTypeKey=${cardTypeKey}&disciplineLoadUuid=${disciplineLoadUuid}`;
    return requestApiJsonAsync<StudentMark>(
        `/mvc/mobile/studentMarks/put`,
        {
            method: 'POST',
            body,
            json: false,
        },
        {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        }
    );
}

export async function putStudentFailureAsync(
    studentUuid: string,
    discipline: Discipline,
    studentFailure: StudentFailure = StudentFailure.NoFailure,
    cardType: CardType = 'lecture'
) {
    const body = `markFailure=${studentFailure}&cardType=${cardType}&disciplineLoad=${discipline.disciplineLoad}&studentId=${studentUuid}`;
    await requestApiAsync(
        `/mvc/mobile/failure/update`,
        {
            method: 'POST',
            body,
            json: false,
        },
        {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        }
    );
}

export async function updateAllMarksAsync(discipline: Discipline) {
    // Одного вызова достаточно, чтобы обновить все оценки по предмету у группы.
    await updateMarksAsync(discipline, 'lecture', 'intermediate');
    // await updateMarksAsync(discipline, 'lecture', 'current');
    // await updateMarksAsync(discipline, 'lecture', 'intermediate');
    // await updateMarksAsync(discipline, 'laboratory', 'current');
    // await updateMarksAsync(discipline, 'laboratory', 'intermediate');
    // await updateMarksAsync(discipline, 'practice', 'current');
    // await updateMarksAsync(discipline, 'practice', 'intermediate');
}

async function updateMarksAsync(
    discipline: Discipline,
    cardType: CardType,
    markType: MarkType
) {
    return updateMarksInternalAsync(
        discipline.disciplineLoad,
        discipline.isModule,
        discipline.groupHistoryId,
        discipline.groupId,
        cardType,
        markType
    );
}

async function updateMarksInternalAsync(
    disciplineLoad: string,
    isModule: boolean,
    groupUuid: string,
    techgroup: string,
    cardType: CardType,
    markType: MarkType
) {
    const modulePart = isModule ? '/module' : '';
    const groupPart = isModule
        ? `techgroup=${techgroup}`
        : `groupUuid=${groupUuid}`;
    const body =
        `disciplineLoad=${disciplineLoad}&${groupPart}` +
        `&cardType=${cardType}&hasTest=false&isTotal=false` +
        `&intermediate=${markType === 'intermediate'}` +
        `&selectedTeachers=null&showActiveStudents=true`;
    return requestApiAsync<string>(
        `/mvc/mobile/updateMarks${modulePart}`,
        {
            method: 'POST',
            body,
            json: false,
        },
        {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        }
    );
}

export async function authByConfigAsync(secretName: string) {
    const secrets = JSON.parse("fs.readFileSync('./secrets/brs.json', 'utf8')");
    const credentials = secrets[secretName] as {
        login: string;
        password: string;
        sid: string; // содержимое Cookie JSSESSIONID, если sid задается, то все login и password не используются
    };
    if (!credentials) {
        throw new Error(`Secret ${secretName} not found`);
    }
    globalSid = credentials.sid
        ? credentials.sid
        : await authAsync(credentials.login, credentials.password);
    globalLogin = credentials.sid ? secretName : credentials.login;
}

export async function authAsync(login: string, password: string): Promise<string | null> {
    const response = await request({
        url: baseUrl + `/login`,
        method: 'POST',
        body: `username=${login}&password=${password}`,
        resolveWithFullResponse: true,
        simple: false,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
    });
    if (!('set-cookie' in response.headers))
        return null;
    const sessionCookie = response.headers['set-cookie']
        .filter((cookie: string) => cookie.startsWith('JSESSIONID='))[0];
    return (sessionCookie as string)
        .split(';')[0]
        .substr('JSESSIONID='.length)
        .trim();
}

async function requestApiJsonAsync<T>(
    uri: string,
    options?: RequestOptions,
    headers?: RequestHeaders
): Promise<T> {
    const response = await requestApiAsync<string>(uri, options, headers);

    if (response.trimLeft().startsWith('<!DOCTYPE html>')) {
        throw new Error(uri + ' is Forbidden');
    }
    return JSON.parse(response);
}

async function requestApiAsync<T>(
    uri: string,
    options?: RequestOptions,
    headers?: RequestHeaders
): Promise<T> {
    if (!globalSid) {
        throw new Error(
            'Not authenticated. Use authByConfigAsync or authAsync to authenticate'
        );
    }
    console.log('Sid:', globalSid);
    return request({
        method: 'GET',
        ...options,
        url: baseUrl + uri,
        headers: {
            'X-Cookie': `JSESSIONID=${globalSid}`,
            'X-Requested-With': 'XMLHttpRequest',
            ...headers,
        },
    });
}

interface RequestOptions {
    method?: string;
    body?: object | string;
    json?: boolean;
}

interface RequestHeaders {
    'Content-Type'?: string;
}

export type CardType = 'lecture' | 'laboratory' | 'practice' | 'additionalPractice';
export type MarkType = 'intermediate' | 'current';

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
    studentPersonalNumber: '09800106',
    isEdit: false,
    studentUuid:
        'studen18hc2jg0000magk6mi3iec84bsundigr18hc2jg0000m53o7mlgvora278',
    status: 1,
    studentStatus: 'Активный',
    ignoreCurrentDebars: false,
    studentFio: 'Анисимова Маргарита Васильевна',
    isExtern: false,
    teacherName: '',
    cardType: 'lecture',
    studentName: 'Анисимова М.В.',
    studentGroup: 'РИ-180001',
    registerClosed: false,
    subgroupsITS: '',
    disciplineLoad: 'unpldd18hc2jg0000m5kojcd3te76bnk',
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
