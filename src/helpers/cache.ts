const localCache: { [name: string]: object | string } = {};

export function save(name: string, data: object | string) {
    if (!data) {
        return false;
    }

    const json = JSON.stringify(data);

    localStorage.setItem(name, json);

    localCache[name] = data;

    return true;
}

export function read<T extends object | string>(name: string) {
    const localData = localCache[name];
    if (localData) {
        return localData as T;
    }

    const content = localStorage.getItem(name);
    if (!content) {
        return null;
    }

    const fileData = JSON.parse(content);
    if (!fileData) {
        return null;
    }

    localCache[name] = fileData;
    return fileData as T;
}

export function clear(name: string) {
    localStorage.removeItem(name);

    delete localCache[name];

    return true;
}
