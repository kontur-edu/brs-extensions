import * as fs from 'fs';

const basePath = './.cache';

const localCache: { [name: string]: object | string } = {};

export function save(name: string, data: object | string) {
  if (!data) {
    return false;
  }

  const json = JSON.stringify(data);

  const cachePath = `${basePath}/${name}`;
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath);
  }
  fs.writeFileSync(cachePath, json, { encoding: 'utf8' });

  localCache[name] = typeof data === 'string' ? data : { ...data };

  return true;
}

export function read<T extends object | string>(name: string) {
  const localData = localCache[name];
  if (localData) {
    return localData as T;
  }

  const cachePath = `${basePath}/${name}`;
  if (!fs.existsSync(cachePath)) {
    return null;
  }

  const content = fs.readFileSync(cachePath, 'utf8');
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
