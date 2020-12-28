export async function authorizeAsync() {
    // globalAuth = await googleAuth.authorizeAsync(policy);
}

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

export interface Spreadsheet {
    readAsync: (range: string) => Promise<ValueRange>;
    writeAsync: (
        range: string,
        values: any[][],
        asEnteredByUser?: boolean
    ) => void;
    appendAsync: (
        range: string,
        values: any[][],
        asEnteredByUser?: boolean
    ) => void;
}

export interface ValueRange {
    majorDimension?: string | null;
    range?: string | null;
    values?: any[][] | null;
}
