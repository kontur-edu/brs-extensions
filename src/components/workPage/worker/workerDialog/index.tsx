import React from 'react';
import "./styles.css"
import {withStyles} from '@material-ui/core/styles';
import {Dialog} from "@material-ui/core";
import MuiDialogTitle from '@material-ui/core/DialogTitle';
import MuiDialogContent from '@material-ui/core/DialogContent';
import MuiDialogActions from '@material-ui/core/DialogActions';
import SubmitWithLoading from "../../../submitWithLoading";
import MarksManager from "../../../../managers/MarksManager";
import BrsApi, {Discipline} from "../../../../apis/brsApi";
import {SpreadsheetData} from "../../../../managers/SpreadsheetManager";
import NestedList, {NestedItem} from "../../../nestedList";
import ReportManager, {Report} from "../../../../managers/ReportManager";

const DialogContent = withStyles(() => ({
    root: {
        padding: 0,
    },
}))(MuiDialogContent);

const DialogActions = withStyles(() => ({
    root: {
        display: 'flex',
        justifyContent: 'space-around'
    },
}))(MuiDialogActions);

export default class WorkerDialog extends React.Component<Props, State> {
    marksManager: MarksManager;

    constructor(props: Props) {
        super(props);

        const {brsApi, save} = props;
        const reportManager = new ReportManager(this.logMessage, this.logConfigurationErrors);
        this.marksManager = new MarksManager(brsApi, reportManager, save);

        this.state = {
            okLoading: true,
            cancelPending: false,
            logItems: [],
        };
    }

    componentDidMount() {
        this.startWork();
    }

    componentWillUnmount() {
        this.marksManager.cancel();
    }

    logConfigurationErrors(errorMessages: string[]) {
        const logItems = errorMessages.map(title => ({title, colored: true}));
        this.setState({logItems});
    }

    logMessage = async (report: Report) => {
        const logItems = await this.reportToNestedListItems(report);
        this.setState({logItems});
    }

    reportToNestedListItems(report: Report): Promise<NestedItem[]> {
        const logItems = this.state.logItems;
        return new Promise(resolve => {
            let title = `Группа ${report.group}`
            const nestedItems: NestedItem[] = [];
            const mainItem: NestedItem = {title, collapsed: true, nestedItems};

            let hasErrors = false;

            const merge = report.merge;
            let mergeResultsTitle = `Сопоставление = ${merge.succeed}`;
            mergeResultsTitle += `, ${merge.failedActual?.length || 0}`;
            mergeResultsTitle += `, ${merge.failedBrs?.length || 0}`;

            const mergeInfoItem: NestedItem = {
                title: mergeResultsTitle,
                collapsed: true,
                nestedItems: [{title: `Успешно сопоставлено = ${merge.succeed}`}]
            };
            nestedItems.push(mergeInfoItem);

            if (!!merge.failedActual) {
                hasErrors = true;
                title = `Не удалось сопоставить ${merge.failedActual.length} студентов из Google Таблицы`;
                mergeInfoItem.nestedItems?.push({
                    title,
                    colored: true,
                    collapsed: true,
                    nestedItems: merge.failedActual.map(s => ({title: s}))
                });
            }
            if (!!merge.failedBrs) {
                hasErrors = true;
                title = `Не удалось сопоставить ${merge.failedBrs.length} студентов из БРС`;
                mergeInfoItem.nestedItems?.push({
                    title,
                    colored: true,
                    collapsed: true,
                    nestedItems: merge.failedBrs.map(s => ({title: s}))
                });
            }

            const marks = report.marks;
            const marksItem: NestedItem = {title: "Выставление баллов", collapsed: true};
            marksItem.nestedItems = marks.map(({title, students}) => ({
                title: this.translateStatus(title) + (students ? ` = ${students.length}` : ''),
                nestedItems: students?.map(s => ({title: s})),
                collapsed: true
            }));
            nestedItems.push(marksItem);

            if (hasErrors) {
                mainItem.colored = true;
                mergeInfoItem.colored = true;
            }
            logItems.push(mainItem);

            resolve(logItems);
        });
    }

    translateStatus(status: string) {
        return status
            .replace("SKIPPED", "Пропущено")
            .replace("UPDATED", "Обновлено")
            .replace("FAILED", "Ошибки");
    }

    startWork = async () => {
        const {spreadsheetData, suitableDisciplines} = this.props.marksData;
        const error = await this.marksManager.putMarksToBrsAsync(spreadsheetData, suitableDisciplines);

        if (error)
            this.props.onError(error);

        this.setState({
            cancelPending: false,
            okLoading: false,
        });
    }

    cancelWork = () => {
        this.setState({cancelPending: true});
        this.marksManager.cancel();
    }

    render() {
        return (
            <React.Fragment>
                <Dialog open={true} maxWidth="md" fullWidth className="worker-dialog">
                    <MuiDialogTitle>Журнал действий</MuiDialogTitle>
                    <DialogContent dividers>
                        <NestedList items={this.state.logItems}/>
                    </DialogContent>
                    <DialogActions>
                        <SubmitWithLoading loading={this.state.okLoading}
                                           onClick={this.props.onClosed}
                                           title="ок"/>
                        <SubmitWithLoading loading={this.state.cancelPending}
                                           disabled={!this.state.okLoading}
                                           onClick={this.cancelWork}
                                           title="отмена"/>
                    </DialogActions>
                </Dialog>
            </React.Fragment>
        );
    }
}

export interface MarksData {
    spreadsheetData: SpreadsheetData;
    suitableDisciplines: Discipline[];
}

interface Props {
    marksData: MarksData;
    brsApi: BrsApi;
    save: boolean;
    onClosed: () => void;
    onError: (errorMessage: string) => void;
}

interface State {
    okLoading: boolean;
    cancelPending: boolean;
    logItems: NestedItem[];
}
