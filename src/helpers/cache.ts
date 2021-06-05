export enum StorageType {
    Local,
    Session,
    LocalAndSession
}

export function save(name: string, data: object | string, whereTo: StorageType) {
    if (!data) {
        return false;
    }

    const json = JSON.stringify(data);

    if (whereTo === StorageType.Local || whereTo === StorageType.LocalAndSession)
        localStorage.setItem(name, json);
    if (whereTo === StorageType.Session || whereTo === StorageType.LocalAndSession)
        sessionStorage.setItem(name, json);

    return true;
}

export function read<T extends object | string>(name: string, whereFrom: StorageType) {
    let content: string | null = null

    if (whereFrom === StorageType.Local)
        content = localStorage.getItem(name);
    if (whereFrom === StorageType.Session)
        content = sessionStorage.getItem(name);
    if (whereFrom === StorageType.LocalAndSession)
        content = sessionStorage.getItem(name) ?? localStorage.getItem(name);

    if (!content) {
        return null;
    }

    const data = JSON.parse(content);
    return data ? data as T : null;
}

export function clear(name: string, storageType: StorageType) {
    if (storageType === StorageType.Local || storageType === StorageType.LocalAndSession)
        localStorage.removeItem(name);
    if (storageType === StorageType.Session || storageType === StorageType.LocalAndSession)
        sessionStorage.removeItem(name);

    return true;
}
