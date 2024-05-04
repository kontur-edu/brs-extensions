import BrsApi, {
  ControlAction,
  Discipline,
  DisciplineMeta,
  CardMeta,
  StudentFailure,
  StudentMark,
} from "../apis/BrsApi";
import {
  compareNormalized,
  groupBy,
  parseAnyFloat,
  pluralize,
  round10,
  round100,
} from "../helpers/tools";
import * as fio from "../helpers/fio";
import { ActualStudent, SpreadsheetData } from "./SpreadsheetManager";
import { formatStudentFailure } from "../helpers/brsHelpers";
import ReportManager from "./ReportManager";
import { BrsReport } from "./BrsReport";

const autoControlActionName = "auto";

enum MarkUpdateStatus {
  Updated,
  Failed,
  Skipped,
}

export default class MarksManager {
  private readonly brsApi: BrsApi;
  private readonly save: boolean;
  private cancelPending: boolean = false;

  readonly reportManager: ReportManager<BrsReport>;

  constructor(
    brsApi: BrsApi,
    reportManager: ReportManager<BrsReport>,
    save: boolean
  ) {
    this.brsApi = brsApi;
    this.reportManager = reportManager;
    this.save = save;
  }

  cancel() {
    this.cancelPending = true;
  }

  async putMarksToBrsAsync(
    spreadsheetData: SpreadsheetData,
    disciplines: Discipline[]
  ) {
    const { actualStudents, disciplineConfig, controlActionConfigs } =
      spreadsheetData;
    try {
      for (const discipline of disciplines) {
        const students = actualStudents.filter((s) =>
          compareNormalized(s.groupName, discipline.group)
        );
        if (students.length === 0) {
          continue;
        }

        this.reportManager.newReport({
          disciplineConfig: disciplineConfig,
          discipline: discipline,
          merge: { succeed: 0 },
          marks: [],
          skipped: [],
        });

        var isSuccessful = await this.putMarksForDisciplineAsync(
          discipline,
          students,
          disciplineConfig.defaultStudentFailure,
          controlActionConfigs
        );

        if (isSuccessful) {
          this.reportManager.finishReport();
        } else {
          this.reportManager.cancelReport();
        }

        if (this.cancelPending) {
          break;
        }
      }

      return null;
    } catch (e) {
      return e;
    }
  }

  async putMarksForDisciplineAsync(
    discipline: Discipline,
    actualStudents: ActualStudent[],
    defaultStudentFailure: StudentFailure,
    controlActionConfigs: ControlActionConfig[]
  ) {
    const disciplineMeta = await this.brsApi.getDisciplineMetaAsync(discipline);

    if (
      !this.checkControlActionsConfiguration(
        discipline,
        disciplineMeta,
        controlActionConfigs
      )
    )
      return false;

    const brsStudents = await this.brsApi.getAllStudentMarksAsync(discipline);
    const { mergedStudents, skippedActualStudents, skippedBrsStudents } =
      this.mergeStudents(actualStudents, brsStudents);

    this.logMergedStudents(
      mergedStudents,
      skippedActualStudents,
      skippedBrsStudents
    );

    await this.putMarksForStudentsAsync(
      discipline,
      disciplineMeta,
      mergedStudents,
      controlActionConfigs
    );

    await this.updateFailuresForSkippedStudentsAsync(
      skippedBrsStudents,
      discipline,
      defaultStudentFailure
    );

    if (this.save) {
      await this.brsApi.updateAllMarksAsync(discipline);
    }

    return true;
  }

  checkControlActionsConfiguration(
    discipline: Discipline,
    disciplineMeta: DisciplineMeta,
    controlActionConfigs: ControlActionConfig[]
  ) {
    const autoControlActionConfig =
      this.tryGetAutoControlActionConfig(controlActionConfigs);
    if (autoControlActionConfig) {
      return true;
    }

    const controlActions = this.getControlActions(disciplineMeta);
    for (const config of controlActionConfigs) {
      if (!this.getSuitableControlAction(discipline, config, controlActions)) {
        return false;
      }
    }
    return true;
  }

  async putMarksForStudentsAsync(
    discipline: Discipline,
    disciplineMeta: DisciplineMeta,
    students: MergedStudent[],
    controlActionConfigs: ControlActionConfig[]
  ) {
    const ratings: Ratings = {};
    let notFinishedStudents = students;

    // 3 попытки при реальной записи нужно для проверки успешности 2-ой попытки
    // 2 попытки при отсутствии записи позволяют проверить работоспособность кода
    const tryCount = this.save ? 3 : 2;
    for (let i = 0; i < tryCount; i++) {
      notFinishedStudents = await this.putMarksForStudentsOnceAsync(
        ratings,
        discipline,
        disciplineMeta,
        notFinishedStudents,
        controlActionConfigs
      );
    }

    const ratingResults: Array<RatingResult> = [];
    for (const studentId in ratings) {
      const r = ratings[studentId];

      if (this.save && !r.finished) {
        r.rating.status = MarkUpdateStatus.Failed;
      }

      ratingResults.push(r.rating);
    }

    const groupedResults = Object.entries(groupBy(ratingResults, "status")).map(
      ([groupKey, rawStudents]) => ({
        title: formatMarkUpdateStatus(rawStudents[0]["status"]),
        students: rawStudents.map((s) => s.infoString),
        failed: rawStudents[0]["status"] === MarkUpdateStatus.Failed,
      })
    );

    this.reportManager.currentReport.marks.push(...groupedResults);
  }

  async putMarksForStudentsOnceAsync(
    ratings: Ratings,
    discipline: Discipline,
    disciplineMeta: DisciplineMeta,
    students: MergedStudent[],
    controlActionConfigs: ControlActionConfig[]
  ) {
    const ratingResults = await Promise.all(
      students.map(async (student) => {
        return await this.putMarksForStudentAsync(
          discipline,
          disciplineMeta,
          student,
          controlActionConfigs
        );
      })
    );
    for (const rating of ratingResults) {
      // 1) S → S stop
      // 2) US → U stop, UU → U, UF → F, FS → F stop, FU → U, FF → F
      const oldRating = ratings[rating.student.brs.studentUuid]?.rating;
      const newRating =
        oldRating && rating.status == MarkUpdateStatus.Skipped
          ? oldRating
          : rating;
      const newFinished = rating.status === MarkUpdateStatus.Skipped;

      ratings[rating.student.brs.studentUuid] = {
        rating: newRating,
        finished: newFinished,
      };
    }

    const brsStudents: { [studentId: string]: StudentMark } = {};
    for (const s of await this.brsApi.getAllStudentMarksAsync(discipline)) {
      brsStudents[s.studentUuid] = s;
    }

    const notFinishedStudents = students
      .filter((s) => !ratings[s.brs.studentUuid]?.finished)
      .map((s) => ({
        actual: s.actual,
        brs: brsStudents[s.brs.studentUuid] || s.brs,
      }));

    return notFinishedStudents;
  }

  async putMarksForStudentAsync(
    discipline: Discipline,
    disciplineMeta: DisciplineMeta,
    student: MergedStudent,
    controlActionConfigs: ControlActionConfig[]
  ): Promise<RatingResult> {
    const autoControlActionConfig =
      this.tryGetAutoControlActionConfig(controlActionConfigs);

    const controlActions = this.getControlActions(disciplineMeta);

    const log: PutMarksLog = {
      failed: 0,
      updated: 0,
      marks: [],
    };

    if (autoControlActionConfig !== null) {
      await this.putAutoMarksForStudentAsync(
        log,
        discipline,
        disciplineMeta,
        student,
        autoControlActionConfig
      );
    } else {
      await this.putManualMarksForStudentAsync(
        log,
        discipline,
        student,
        controlActionConfigs,
        controlActions
      );
    }

    const brsFailureStatus =
      (student.brs.failure as StudentFailure) ?? StudentFailure.NoFailure;
    const actualFailure = student.actual.failure ?? StudentFailure.NoFailure;
    let failureStatus: string;
    if (actualFailure === brsFailureStatus) {
      failureStatus = `${formatStudentFailure(actualFailure)}`;
    } else {
      failureStatus = `${formatStudentFailure(actualFailure)}!`;
      try {
        if (this.save) {
          await this.brsApi.putStudentFailureAsync(
            student.brs.studentUuid,
            discipline,
            actualFailure
          );
        }
        log.updated++;
      } catch (error) {
        log.failed++;
      }
    }

    const status =
      log.failed > 0
        ? MarkUpdateStatus.Failed
        : log.updated > 0
        ? MarkUpdateStatus.Updated
        : MarkUpdateStatus.Skipped;
    const studentName = student.actual.fullName.substr(0, 30);
    let infoString = `${studentName} баллы: ${log.marks.join(" ")}`;
    if (failureStatus && failureStatus !== "-")
      infoString += `, ${failureStatus}`;

    return { student, status, infoString };
  }

  async putAutoMarksForStudentAsync(
    log: PutMarksLog,
    discipline: Discipline,
    disciplineMeta: DisciplineMeta,
    student: MergedStudent,
    autoControlActionConfig: ControlActionConfig
  ) {
    const autoMarkString =
      student.actual.properties[autoControlActionConfig.propertyIndex];
    const autoMark = parseAnyFloat(autoMarkString);

    const controlActionGroups = this.getControlActionGroups(disciplineMeta);

    const currentControlActionGroups = controlActionGroups.filter(
      (it) => !it.isIntermediate
    );
    const currentFactor = currentControlActionGroups.reduce(
      (result, it) => result + it.factor,
      0
    );

    const intermediateControlActionGroups = controlActionGroups.filter(
      (it) => it.isIntermediate
    );
    const intermediateFactor = intermediateControlActionGroups.reduce(
      (result, it) => it.factor,
      0
    );

    const output = `[auto=${autoMark}]`;
    log.marks.push(`             ${output}`.substr(`${output}`.length - 1));

    // NOTE: Если баллов достаточно для удовлетворительной оценки,
    // то заполняем КМы по возможности максимальными оценками с первого к последнему.
    if (40 <= autoMark) {
      await this.putMarksTryFillActionsWithMaxScoreAsync(
        log,
        discipline,
        student,
        controlActionGroups,
        autoMark
      );
    }
    // NOTE: Если баллов достаточно, чтобы поставить за семестр 40, то ставим
    else if (currentFactor * 40 <= autoMark) {
      const currentMark = 40;
      const rawIntermediateMark =
        currentFactor > 0
          ? (autoMark - currentFactor * currentMark) / intermediateFactor
          : 0;
      const intermediateMark = round100(rawIntermediateMark);

      await this.putMarksTryFillActionsWithMaxScoreAsync(
        log,
        discipline,
        student,
        currentControlActionGroups,
        currentMark
      );

      await this.putMarksTryFillActionsWithMaxScoreAsync(
        log,
        discipline,
        student,
        intermediateControlActionGroups,
        intermediateMark
      );
    }
    // NOTE: Иначе ставим за семестр все, что возможно, а за сессию 0.
    else {
      const intermediateMark = 0;
      const rawCurrentMark =
        currentFactor > 0
          ? (autoMark - intermediateFactor * intermediateMark) / currentFactor
          : 0;
      const currentMark = round100(rawCurrentMark);

      await this.putMarksTryFillActionsWithMaxScoreAsync(
        log,
        discipline,
        student,
        currentControlActionGroups,
        currentMark
      );

      await this.putMarksTryFillActionsWithMaxScoreAsync(
        log,
        discipline,
        student,
        intermediateControlActionGroups,
        intermediateMark
      );
    }
  }

  async putMarksTryFillActionsWithMaxScoreAsync(
    log: PutMarksLog,
    discipline: Discipline,
    student: MergedStudent,
    controlActionGroups: ControlActionGroup[],
    mark: number
  ) {
    for (const controlActionGroup of controlActionGroups) {
      const controlActions = controlActionGroup.controlActions;

      let value = mark;
      for (let i = 0; i < controlActions.length; i++) {
        const controlAction = controlActions[i];
        const actualMark =
          controlAction.maxValue < value
            ? controlAction.maxValue
            : round10(value);
        value -= actualMark;

        await this.putMarkAsync(
          log,
          discipline,
          student,
          controlAction,
          actualMark
        );
      }
    }
  }

  async putManualMarksForStudentAsync(
    log: PutMarksLog,
    discipline: Discipline,
    student: MergedStudent,
    controlActionConfigs: ControlActionConfig[],
    controlActions: ControlAction[]
  ) {
    for (const config of controlActionConfigs) {
      const controlAction = this.getSuitableControlAction(
        discipline,
        config,
        controlActions
      );
      if (!controlAction) {
        throw new Error(
          `Подходящее контрольное мероприятие для «${config.controlAction}» не найдено в БРС`
        );
      }

      const actualMarkString = student.actual.properties[config.propertyIndex];
      const actualMark = parseAnyFloat(actualMarkString);

      await this.putMarkAsync(
        log,
        discipline,
        student,
        controlAction,
        actualMark
      );
    }

    return log;
  }

  async putMarkAsync(
    log: PutMarksLog,
    discipline: Discipline,
    student: MergedStudent,
    controlAction: ControlAction,
    actualMark: number
  ) {
    const brsMarkString = student.brs[controlAction.uuid] as string;
    const brsMark = parseAnyFloat(brsMarkString);

    const needUpdateMark =
      !isNaN(actualMark) &&
      !(isNaN(brsMark) ? actualMark === 0 : brsMark === actualMark);
    const actualMarkOutput = !isNaN(actualMark) ? actualMark.toString() : "-";
    const controlActionOutput = controlAction.controlAction.substring(0, 3);

    if (needUpdateMark) {
      log.marks.push(
        `       ${controlActionOutput}=${actualMarkOutput}!`.substr(
          `${actualMarkOutput}`.length - 1
        )
      );
    } else {
      log.marks.push(
        `       ${controlActionOutput}=${actualMarkOutput} `.substr(
          `${actualMarkOutput}`.length - 1
        )
      );
      return;
    }

    try {
      if (this.save) {
        await this.brsApi.putStudentMarkAsync(
          student.brs.studentUuid,
          controlAction.uuidWithoutPrefix,
          actualMark,
          discipline.groupHistoryId,
          student.brs.cardType,
          student.brs.disciplineLoad
        );
      }
      log.updated++;
    } catch (error) {
      log.failed++;
    }
  }

  getSuitableControlAction(
    discipline: Discipline,
    config: ControlActionConfig,
    controlActions: ControlAction[]
  ) {
    const suitableControlActions = controlActions.filter((a) =>
      compareNormalized(a.controlAction, config.controlAction)
    );

    const errorMessages = [];

    if (suitableControlActions.length === 0) {
      errorMessages.push(
        `Группа ${discipline.group}` +
          (discipline.teacherName !== undefined
            ? `, преподаватель ${discipline.teacherName}`
            : "")
      );
      errorMessages.push(
        `- контрольное мероприятие «${config.controlAction}» не сопоставлено с БРС`
      );
      errorMessages.push(
        `- найденные в БРС контрольные мероприятия: ${controlActions
          .map((a) => a.controlAction)
          .join(", ")}`
      );

      this.reportManager.onInvalidConfiguration(errorMessages);

      return null;
    }

    if (config.matchIndex !== undefined || config.matchCount !== undefined) {
      if (
        config.matchIndex === undefined ||
        config.matchCount === undefined ||
        suitableControlActions.length !== config.matchCount ||
        config.matchIndex >= config.matchCount
      ) {
        errorMessages.push(
          `Неверная конфигурация контрольного мероприятия «${config.controlAction}»`
        );
        if (suitableControlActions.length !== config.matchCount) {
          errorMessages.push(
            `В БРС найдено ${suitableControlActions.length} ${pluralize(
              suitableControlActions.length,
              "подходящее контрольное мероприятие",
              "подходящих контрольных мероприятия",
              "подходящих контрольных мероприятий"
            )}, а в таблице указано ${config.matchCount}`
          );
        }

        this.reportManager.onInvalidConfiguration(errorMessages);

        return null;
      }
      return suitableControlActions[config.matchIndex];
    }

    if (suitableControlActions.length > 1) {
      errorMessages.push(
        `Несколько контрольных мероприятий найдено для «${config.controlAction}»`
      );
      errorMessages.push(
        `Найденные контрольные мероприятия: ${suitableControlActions
          .map((a) => a.controlAction)
          .join(", ")}`
      );

      this.reportManager.onInvalidConfiguration(errorMessages);

      return null;
    }

    return suitableControlActions[0];
  }

  async updateFailuresForSkippedStudentsAsync(
    students: StudentMark[],
    discipline: Discipline,
    defaultStudentFailure: StudentFailure
  ) {
    const ratingResults = await Promise.all(
      students.map((student) =>
        this.updateFailureForStudent(student, discipline, defaultStudentFailure)
      )
    );

    if (ratingResults.length > 0) {
      const groupedResults = Object.entries(
        groupBy(ratingResults, "status")
      ).map(([groupKey, rawStudents]) => ({
        title: formatMarkUpdateStatus(rawStudents[0]["status"]),
        students: rawStudents.map((s) => s.infoString),
      }));

      this.reportManager.currentReport.skipped.push(...groupedResults);
    }
  }

  async updateFailureForStudent(
    student: StudentMark,
    discipline: Discipline,
    defaultStudentFailure: StudentFailure
  ) {
    let status: MarkUpdateStatus;
    const brsFailureStatus = student.failure
      ? (student.failure as StudentFailure)
      : StudentFailure.NoFailure;
    const actualFailure = defaultStudentFailure;
    if (actualFailure === brsFailureStatus) {
      status = MarkUpdateStatus.Skipped;
    } else {
      try {
        if (this.save) {
          await this.brsApi.putStudentFailureAsync(
            student.studentUuid,
            discipline,
            actualFailure
          );
        }
        status = MarkUpdateStatus.Updated;
      } catch (error) {
        status = MarkUpdateStatus.Failed;
      }
    }

    const studentName = student.studentFio.substr(0, 30);
    const description =
      status !== MarkUpdateStatus.Skipped
        ? `выставлено «${formatStudentFailure(
            actualFailure
          )}», было «${formatStudentFailure(brsFailureStatus)}»`
        : `«${formatStudentFailure(actualFailure)}»`;

    const infoString = `${studentName}, ${description}`;

    return { status, infoString };
  }

  tryGetAutoControlActionConfig(
    controlActionConfigs: ControlActionConfig[]
  ): ControlActionConfig | null {
    const autoConfigs = controlActionConfigs.filter(
      (it) => it.controlAction.toLowerCase() === autoControlActionName
    );

    if (autoConfigs.length === 1) {
      return autoConfigs[0];
    }

    if (autoConfigs.length > 1) {
      this.reportManager.onInvalidConfiguration([
        `Найдено несколько колонок «${autoControlActionName}» с автоитогом`,
      ]);
    }
    return null;
  }

  getControlActions(disciplineMeta: DisciplineMeta) {
    const controlActions = [
      ...(disciplineMeta.lecture?.currentControlActions || []),
      ...(disciplineMeta.lecture?.intermediateControlActions || []),
      ...(disciplineMeta.laboratory?.currentControlActions || []),
      ...(disciplineMeta.laboratory?.intermediateControlActions || []),
      ...(disciplineMeta.practice?.currentControlActions || []),
      ...(disciplineMeta.practice?.intermediateControlActions || []),
      ...(disciplineMeta.additionalPractice?.currentControlActions || []),
      ...(disciplineMeta.additionalPractice?.intermediateControlActions || []),
    ];

    return controlActions;
  }

  getControlActionGroups(disciplineMeta: DisciplineMeta) {
    const groups: ControlActionGroup[] = [];

    if (disciplineMeta.lecture) {
      this.pushControlActionGroups(groups, disciplineMeta.lecture);
    }
    if (disciplineMeta.laboratory) {
      this.pushControlActionGroups(groups, disciplineMeta.laboratory);
    }
    if (disciplineMeta.practice) {
      this.pushControlActionGroups(groups, disciplineMeta.practice);
    }
    if (disciplineMeta.additionalPractice) {
      this.pushControlActionGroups(groups, disciplineMeta.additionalPractice);
    }

    return groups;
  }

  pushControlActionGroups(groups: ControlActionGroup[], cardMeta: CardMeta) {
    if (cardMeta.currentControlActions.length > 0) {
      const factor = round100(cardMeta.currentFactor * cardMeta.totalFactor);
      const controlActions = cardMeta.currentControlActions;
      groups.push({ factor, controlActions, isIntermediate: false });
    }
    if (cardMeta.intermediateControlActions.length > 0) {
      const factor = round100(
        cardMeta.intermediateFactor * cardMeta.totalFactor
      );
      const controlActions = cardMeta.intermediateControlActions;
      groups.push({ factor, controlActions, isIntermediate: true });
    }
  }

  mergeStudents(actualStudents: ActualStudent[], brsStudents: StudentMark[]) {
    const activeBrsStudents = brsStudents.filter(isStudentActiveAndShouldPass);

    const mergedStudents: MergedStudent[] = [];
    const skippedActualStudents: ActualStudent[] = [];
    for (const actualStudent of actualStudents) {
      const suitableStudents = activeBrsStudents.filter((brsStudent) =>
        areStudentsLike(brsStudent, actualStudent)
      );
      if (suitableStudents.length === 1) {
        mergedStudents.push({
          actual: actualStudent,
          brs: suitableStudents[0],
        });
      } else {
        skippedActualStudents.push(actualStudent);
      }
    }

    const skippedBrsStudents: StudentMark[] = [];
    for (const brsStudent of activeBrsStudents) {
      if (
        !mergedStudents.some(
          (ms) => ms.brs.studentUuid === brsStudent.studentUuid
        )
      ) {
        skippedBrsStudents.push(brsStudent);
      }
    }

    return { mergedStudents, skippedActualStudents, skippedBrsStudents };
  }

  logMergedStudents(
    mergedStudents: MergedStudent[],
    skippedActualStudents: ActualStudent[],
    skippedBrsStudents: StudentMark[]
  ) {
    const report = this.reportManager.currentReport;

    report.merge.succeed = mergedStudents.length;

    if (skippedActualStudents.length > 0)
      report.merge.failedActual = skippedActualStudents.map((s) => s.fullName);

    if (skippedBrsStudents.length > 0) {
      report.merge.failedBrs = skippedBrsStudents.map((s) => s.studentFio);
    }
  }
}

function isStudentActiveAndShouldPass(brsStudent: StudentMark) {
  return (
    brsStudent.studentStatus !== "Переведен" &&
    brsStudent.studentStatus !== "Отчислен" &&
    brsStudent.studentStatus !== "Переведен" &&
    brsStudent.studentStatus !== "Отп.акад." &&
    brsStudent.failure !== StudentFailure.ShouldNotPass
  );
}

function areStudentsLike(
  brsStudent: StudentMark,
  actualStudent: ActualStudent
) {
  const brsFullName = fio.toKey(brsStudent.studentFio);
  const actualFullName = fio.toKey(actualStudent.fullName);
  return brsFullName.startsWith(actualFullName);
}

function formatMarkUpdateStatus(status: MarkUpdateStatus) {
  switch (status) {
    case MarkUpdateStatus.Updated:
      return "ОБНОВЛЕНО";
    case MarkUpdateStatus.Skipped:
      return "ПРОПУЩЕНО";
    case MarkUpdateStatus.Failed:
      return "ПРОВАЛЕНО";
    default:
      throw new Error("Неизвестный статус обновления оценок");
  }
}

export interface ControlActionConfig {
  controlAction: string;
  matchIndex?: number;
  matchCount?: number;
  propertyIndex: number;
}

interface MergedStudent {
  actual: ActualStudent;
  brs: StudentMark;
}

interface PutMarksLog {
  updated: number;
  failed: number;
  marks: string[];
}

interface ControlActionGroup {
  factor: number;
  controlActions: ControlAction[];
  isIntermediate: boolean;
}

interface RatingResult {
  student: MergedStudent;
  status: MarkUpdateStatus;
  infoString: string;
}

interface Ratings {
  [studentId: string]: { rating: RatingResult; finished: boolean };
}
