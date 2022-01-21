export function fixSpaces(str: string) {
  return str && str.replace(/[\s]/g, " ");
}

export function normalizeString(str: string) {
  return (
    str &&
    str
      .toLowerCase()
      .replace("ё", "е")
      .replace(/[^A-Za-zА-ЯЁа-яё0-9]/g, "")
  );
}

export function compareNormalized(s1: string, s2: string) {
  return normalizeString(s1) === normalizeString(s2);
}

export function parseAnyFloat(s: string) {
  return parseFloat(s && s.replace(",", "."));
}

export function groupBy<TItem>(items: TItem[], key: keyof TItem) {
  const reducer: { [group: string]: TItem[] } = {};
  return items.reduce((reducer, item) => {
    const itemKey = `${item[key]}`;
    (reducer[itemKey] = reducer[itemKey] || []).push(item);
    return reducer;
  }, reducer);
}

export function getKeys<T>(obj: T): (keyof T)[] {
  const keys = Object.keys(obj) as (keyof T)[];
  return keys;
}

export function filterNull<T>(items: (T | null)[]): T[] {
  const result: T[] = [];
  for (const item of items) {
    if (item !== null) {
      result.push(item);
    }
  }
  return result;
}

export function pluralize(
  count: number,
  version1: string,
  version2: string,
  version5: string
) {
  if (
    count % 10 === 0 ||
    count % 10 >= 5 ||
    (count % 100 > 10 && count % 100 < 20)
  )
    return version5;
  return count % 10 === 1 ? version1 : version2;
}

export function round10(value: number) {
  return Math.round(value * 10) / 10;
}

export function round100(value: number) {
  return Math.round(value * 100) / 100;
}
