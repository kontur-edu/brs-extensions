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
