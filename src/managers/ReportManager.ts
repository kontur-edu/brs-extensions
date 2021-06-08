export default class ReportManager {
    private _currentReport: Report | null = null;
    private readonly onReportFinished: (report: Report) => void;

    readonly onInvalidConfiguration: (errorMessages: string[]) => void;

    constructor(
        onReportFinished: (report: Report) => void,
        onInvalidConfiguration: (errorMessages: string[]) => void) {
        this.onReportFinished = onReportFinished;
        this.onInvalidConfiguration = onInvalidConfiguration;
    }

    get currentReport() {
        if (!this._currentReport)
            throw new Error("Построение отчета еще не начато");
        return this._currentReport;
    }

    newReport(group: string) {
        this.finishReport();
        this._currentReport = {
            group,
            merge: {succeed: 0},
            marks: []
        };
    }

    finishReport() {
        if (this._currentReport)
            this.onReportFinished(this._currentReport);
        this._currentReport = null;
    }
}

export interface Report {
    group: string;
    merge: {
        succeed: number;
        failedActual?: string[];
        failedBrs?: string[];
    }
    marks: Section[];
}

export interface Section {
    title: string;
    students?: string[];
}
