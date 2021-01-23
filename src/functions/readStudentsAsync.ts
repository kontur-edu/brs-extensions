import { StudentFailure } from '../apis/brsApi';
import * as googleApi from '../apis/googleApi';
import { parseStudentFailure } from '../helpers/brsHelpers';

export interface ActualStudent {
    fullName: string;
    groupName: string;
    id: string | null;
    failure: StudentFailure | null;
    properties: string[];
}

export async function fromSpreadsheetAsync(
    spreadsheetId: string,
    readRange: string,
    fullNameIndex: number = 0,
    groupNameIndex: number = 1,
    idIndex: number | null = null,
    failureIndex: number | null = null
) {
    await googleApi.authorizeAsync();
    const sheet = googleApi.getSpreadsheet(spreadsheetId);

    const rows = (await sheet.readAsync(readRange)).values || [];

    const result: ActualStudent[] = [];
    for (const row of rows) {
        const fullName = row[fullNameIndex];
        const groupName = row[groupNameIndex];
        const id = idIndex !== null ? row[idIndex] : null;
        const failure =
            failureIndex !== null
                ? parseStudentFailure(row[failureIndex])
                : null;
        if (fullName && groupName) {
            result.push({
                fullName,
                groupName,
                id: id,
                failure: failure,
                properties: row,
            });
        }
    }
    return result;
}
