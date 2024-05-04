import { Discipline } from "../apis/BrsApi";
import { DisciplineConfig } from "./SpreadsheetManager";

export interface BrsReport {
  disciplineConfig: DisciplineConfig
  discipline: Discipline;
  merge: {
    succeed: number;
    failedActual?: string[];
    failedBrs?: string[];
  };
  marks: BrsReportSection[];
  skipped: BrsReportSection[];
}

export interface BrsReportSection {
  title: string;
  students?: string[];
  failed?: boolean;
}
