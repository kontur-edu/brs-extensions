const memoryCache: { [name: string]: object | string } = {};

export function save(name: string, data: object | string) {
    if (!data) {
        return false;
    }

    const json = JSON.stringify(data);

    localStorage.setItem(name, json);

    memoryCache[name] = data;

    return true;
}

export function read<T extends object | string>(name: string) {
    const localData = memoryCache[name];
    if (localData) {
        return localData as T;
    }

    const content = localStorage.getItem(name);
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

export function clear(name: string) {
    localStorage.removeItem(name);

    delete memoryCache[name];

    return true;
}
