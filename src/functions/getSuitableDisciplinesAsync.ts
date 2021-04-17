import BrsApi from '../apis/brsApi';
import {compareNormalized} from '../helpers/tools';
import {DisciplineConfig} from "./getSpreadsheetDataAsync";

export default async function getSuitableDisciplinesAsync(brsApi: BrsApi, disciplineConfig: DisciplineConfig) {
    const allDisciplines = await brsApi.getDisciplineCachedAsync(
        disciplineConfig.year,
        disciplineConfig.termType,
        disciplineConfig.course,
        disciplineConfig.isModule
    );

    return allDisciplines.filter(
        (d) =>
            compareNormalized(d.discipline, disciplineConfig.name) &&
            (!disciplineConfig.isSuitableDiscipline ||
                disciplineConfig.isSuitableDiscipline(d))
    );
}
