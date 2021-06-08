import {StudentFailure} from '../apis/BrsApi';
import {compareNormalized} from './tools';

const failureMapping: { [key: string]: StudentFailure } = {
    '-': StudentFailure.NoFailure,
    'Не выбрана': StudentFailure.NotChosen,
    'Не допущен (деканат)': StudentFailure.NotAllowedByDeansOffice,
    'Не явился': StudentFailure.NotAppeared,
    Неуважительная: StudentFailure.DisrespectfulReason,
    Уважительная: StudentFailure.RespectfulReason,
    'Не допущен': StudentFailure.NotAllowedByTeacher,
    'Не должен сдавать': StudentFailure.ShouldNotPass,
    'Академический отпуск': StudentFailure.AcademicLeave,
    Выбыл: StudentFailure.DroppedOut,
};

export function parseStudentFailure(input: string): StudentFailure | null {
    if (input === null || input === undefined) {
        return null;
    }

    for (let key of Object.keys(failureMapping)) {
        if (compareNormalized(key, input)) {
            return failureMapping[key];
        }
    }

    return StudentFailure.NoFailure;
}

export function formatStudentFailure(
    input: StudentFailure | null | undefined
): string | null {
    if (input === null || input === undefined) {
        return null;
    }

    for (let key of Object.keys(failureMapping)) {
        if (failureMapping[key] === input) {
            return key;
        }
    }

    return '-';
}
