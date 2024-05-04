export default class ReportManager<TReport> {
  private _currentReport: TReport | null = null;
  private readonly onReportFinished: (report: TReport) => void;

  readonly onInvalidConfiguration: (errorMessages: string[]) => void;

  constructor(
    onReportFinished: (report: TReport) => void,
    onInvalidConfiguration: (errorMessages: string[]) => void
  ) {
    this.onReportFinished = onReportFinished;
    this.onInvalidConfiguration = onInvalidConfiguration;
  }

  get currentReport() {
    if (!this._currentReport)
      throw new Error("Построение отчета еще не начато");
    return this._currentReport;
  }

  newReport(report: TReport) {
    this.finishReport();
    this._currentReport = report
  }

  finishReport() {
    if (this._currentReport) this.onReportFinished(this._currentReport);
    this._currentReport = null;
  }

  cancelReport() {
    this._currentReport = null;
  }
}
