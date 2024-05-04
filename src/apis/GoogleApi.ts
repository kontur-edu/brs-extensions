export function getSpreadsheet(spreadsheetId: string): Spreadsheet {
  const sheets = gapi.client.sheets;

  async function readAsync(range: string) {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return response.result;
  }

  async function getMetaAsync() {
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    const meta = JSON.parse(response.body) as SpreadsheetMeta;
    return meta;
  }

  return {
    readAsync,
    getMetaAsync
  };
}

export interface Spreadsheet {
  readAsync: (range: string) => Promise<ValueRange>;
  getMetaAsync: () => Promise<SpreadsheetMeta>
}

export interface ValueRange {
  majorDimension?: string | null;
  range?: string | null;
  values?: any[][] | null;
}

export interface SpreadsheetMeta {
  spreadsheetId: string;
  properties: SpreadsheetProperties;
  sheets: Sheet[];
}

export interface SpreadsheetProperties {
  title: string;
}

export interface Sheet {
  properties: SheetProperties;
}

export interface SheetProperties {
  sheetId: number;
  title: string;
}
