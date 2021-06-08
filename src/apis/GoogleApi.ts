export function getSpreadsheet(spreadsheetId: string): Spreadsheet {
  const sheets = gapi.client.sheets;

  async function readAsync(range: string) {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return response.result;
  }

  return {
    readAsync,
  };
}

export async function getSpreadsheetProperties(
  spreadsheetId: string
): Promise<SpreadsheetProperties[]> {
  const sheets = gapi.client.sheets;

  const res = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetProps = JSON.parse(res.body).sheets as [
    { properties: SpreadsheetProperties }
  ];
  return sheetProps.map((s) => s.properties);
}

export interface Spreadsheet {
  readAsync: (range: string) => Promise<ValueRange>;
}

export interface ValueRange {
  majorDimension?: string | null;
  range?: string | null;
  values?: any[][] | null;
}

export interface SpreadsheetProperties {
  sheetId: number;
  title: string;
}
