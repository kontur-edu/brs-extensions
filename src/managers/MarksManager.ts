import BrsApi, { Discipline, StudentFailure } from '../apis/brsApi';
import { compareNormalized } from '../helpers/tools';
import { Logger } from '../helpers/logger';
import { ActualStudent } from '../functions/readStudentsAsync';
import DisciplineMarksManager, {
    ControlActionConfig,
    PutMarksOptions,
} from './DisciplineMarksManager';

export type { ControlActionConfig, PutMarksOptions };

export default class MarksManager {
    private readonly brsApi: BrsApi;
    private readonly logger: Logger;
    private readonly disciplineMarksManager: DisciplineMarksManager;
    private cancelPending: boolean = false;

    constructor(brsApi: BrsApi, logger: Logger, options: PutMarksOptions) {
        this.brsApi = brsApi;
        this.logger = logger;
        this.disciplineMarksManager = new DisciplineMarksManager(
            brsApi,
            logger,
            options
        );
    }

    cancel() {
        this.cancelPending = true;
    }

    async putMarksToBrsAsync(marksData: MarksData) {
        const {
            actualStudents,
            disciplineConfig,
            controlActionConfigs,
        } = marksData;

        try {
            const disciplines = await this.getSuitableDisciplinesAsync(
                disciplineConfig
            );

            for (const discipline of disciplines) {
                await this.disciplineMarksManager.putMarksForDisciplineAsync(
                    discipline,
                    actualStudents.filter((s) =>
                        compareNormalized(s.groupName, discipline.group)
                    ),
                    disciplineConfig.defaultStudentFailure,
                    controlActionConfigs
                );
                if (this.cancelPending) {
                    break;
                }
            }
        } catch (e) {
            this.logger.error(e);
        }
    }

    async getSuitableDisciplinesAsync(disciplineConfig: DisciplineConfig) {
        const allDisciplines = await this.brsApi.getDisciplineCachedAsync(
            disciplineConfig.year,
            disciplineConfig.termType,
            disciplineConfig.course,
            disciplineConfig.isModule
        );
        const disciplines = allDisciplines.filter(
            (d) =>
                compareNormalized(d.discipline, disciplineConfig.name) &&
                (!disciplineConfig.isSuitableDiscipline ||
                    disciplineConfig.isSuitableDiscipline(d))
        );
        return disciplines;
    }

    getLogger() {
        return this.logger;
    }
}

export interface MarksData {
    actualStudents: ActualStudent[];
    disciplineConfig: DisciplineConfig;
    controlActionConfigs: ControlActionConfig[];
}

export interface DisciplineConfig {
    name: string;
    year: number;
    termType: number;
    course: number;
    isModule: boolean;
    defaultStudentFailure: StudentFailure;
    isSuitableDiscipline: ((d: Discipline) => boolean) | null;
}
