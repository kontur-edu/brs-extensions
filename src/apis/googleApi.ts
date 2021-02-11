export function getSpreadsheet(spreadsheetId: string): Spreadsheet {
    // @ts-ignore
    const sheets = gapi.client.sheets;

    async function readAsync(range: string) {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        return response.result;
    }

    function writeAsync(range: string, values: any[][], asEnteredByUser = false) {
        const valueInputOption = asEnteredByUser ? "USER_ENTERED" : "RAW";
        const requestBody = {
            values,
        };
        return sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption,
            requestBody,
        });
    }

    function appendAsync(
        range: string,
        values: any[][],
        asEnteredByUser = false
    ) {
        const valueInputOption = asEnteredByUser ? "USER_ENTERED" : "RAW";
        const requestBody = {
            values,
        };
        return sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption,
            requestBody,
        });
    }

    return {
        readAsync,
        writeAsync,
        appendAsync,
    };
}

export async function getSpreadsheetProperties(spreadsheetId: string): Promise<SpreadsheetProperties[]> {
    // @ts-ignore
    const sheets = gapi.client.sheets;

    const res = await sheets.spreadsheets.get({spreadsheetId});
    const sheetProps = JSON.parse(res.body).sheets as [{ properties: SpreadsheetProperties }];
    return sheetProps.map(s => s.properties)
}

export interface Spreadsheet {
    readAsync: (range: string) => Promise<ValueRange>;
    writeAsync: (
        range: string,
        values: any[][],
        asEnteredByUser?: boolean
    ) => Promise<any>;
    appendAsync: (
        range: string,
        values: any[][],
        asEnteredByUser?: boolean
    ) => Promise<any>;
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
