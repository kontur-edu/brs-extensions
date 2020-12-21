import * as fileApi from '../apis/fileApi';
import * as googleApi from '../apis/googleApi';

export interface ActualStudent {
    fullName: string;
    groupName: string;
    id: string | null;
    properties: string[];
}

export async function fromSpreadsheetAsync(
    spreadsheetId: string,
    readRange: string,
    fullNameIndex: number = 0,
    groupNameIndex: number = 1,
    idIndex: number | null = null,
) {
    await googleApi.authorizeAsync();
    const sheet = googleApi.getSpreadsheet(spreadsheetId);

    const rows = (await sheet.readAsync(readRange)).values || [];

    const result: ActualStudent[] = [];
    for (const row of rows) {
        const fullName = row[fullNameIndex];
        const groupName = row[groupNameIndex];
        const id = idIndex !== null ? row[idIndex] : null;
        if (fullName && groupName) {
            result.push({
                fullName,
                groupName,
                id: id,
                properties: row,
            });
        }
    }
    return result;
}

export function fromCvs(
    filePath: string,
    skipHeader: boolean = false,
    fullNameIndex: number = 0,
    groupNameIndex: number = 1,
    idIndex: number | null = null
): ActualStudent[] {
    const rows = fileApi.readFromCsv(filePath, skipHeader, ',');
    const result = [];
    for (const row of rows) {
        if (
            row.columns.length <= fullNameIndex ||
            row.columns.length <= groupNameIndex
        ) {
            throw new Error(`Can't parse line of actual students file`);
        }
        result.push({
            fullName: row.columns[fullNameIndex],
            groupName: row.columns[groupNameIndex],
            id: idIndex !== null ? row.columns[idIndex] : null,
            properties: row.columns,
        });
    }
    return result;
}
