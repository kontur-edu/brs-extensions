import {DisciplineConfig} from "../functions/getSpreadsheetDataAsync";

const memoryCache: { [name: string]: object | string } = {};

export function save(name: string, data: object | string, whereTo: StorageType) {
    if (!data) {
        return false;
    }

    const json = JSON.stringify(data);

    if (whereTo === StorageType.Local || whereTo === StorageType.LocalAndSession)
        localStorage.setItem(name, json);
    if (whereTo === StorageType.Session || whereTo === StorageType.LocalAndSession)
        sessionStorage.setItem(name, json);

    memoryCache[name] = data;

    return true;
}

export function read<T extends object | string>(name: string, whereFrom: StorageType) {
    const localData = memoryCache[name];
    if (localData && whereFrom !== StorageType.Session) {
        return localData as T;
    }

    let content: string | null = null

    if (whereFrom === StorageType.Local || whereFrom === StorageType.LocalAndSession)
        content = localStorage.getItem(name);
    if (whereFrom === StorageType.Session || whereFrom === StorageType.LocalAndSession)
        content = sessionStorage.getItem(name);

    if (!content) {
        return null;
    }

    const memoryData = JSON.parse(content);
    if (!memoryData) {
        return null;
    }

    memoryCache[name] = memoryData;
    return memoryData as T;
}

export function clear(name: string, storageType: StorageType) {
    if (storageType === StorageType.Local || storageType === StorageType.LocalAndSession)
        localStorage.removeItem(name);
    if (storageType === StorageType.Session || storageType === StorageType.LocalAndSession)
        sessionStorage.removeItem(name);

    delete memoryCache[name];

    return true;
}

export function buildCacheName(login: string, method: string, disciplineConfig: DisciplineConfig) {
    const {year, termType, course, isModule} = disciplineConfig;
    return `${login}_${method}_${year}_${termType}_${course}_${isModule}`;
}

export enum StorageType {
    Local,
    Session,
    LocalAndSession
}
