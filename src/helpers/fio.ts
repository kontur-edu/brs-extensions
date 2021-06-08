export function toShow(fio: string) {
  return fio.replace("ё", "е").replace(/[ ]+/, " ");
}

export function toKey(fio: string) {
  return fio.toLowerCase().replace("ё", "е").replace(/[ ]+/, " ").trim();
}
