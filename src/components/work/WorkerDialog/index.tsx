import React from "react";
import "./styles.css";
import { withStyles } from "@material-ui/core/styles";
import { Dialog } from "@material-ui/core";
import MuiDialogTitle from "@material-ui/core/DialogTitle";
import MuiDialogContent from "@material-ui/core/DialogContent";
import MuiDialogActions from "@material-ui/core/DialogActions";
import SubmitWithLoading from "../../shared/SubmitWithLoading";
import MarksManager from "../../../managers/MarksManager";
import BrsApi, { Discipline, TermType } from "../../../apis/BrsApi";
import { SpreadsheetData } from "../../../managers/SpreadsheetManager";
import NestedList, { NestedItem } from "../../shared/NestedList";
import ReportManager from "../../../managers/ReportManager";
import { pluralize } from "../../../helpers/tools";
import { BrsReport } from "../../../managers/BrsReport";

const DialogContent = withStyles(() => ({
  root: {
    padding: 0,
  },
}))(MuiDialogContent);

const DialogActions = withStyles(() => ({
  root: {
    display: "flex",
    justifyContent: "space-around",
  },
}))(MuiDialogActions);

export default class WorkerDialog extends React.Component<Props, State> {
  marksManager: MarksManager;

  constructor(props: Props) {
    super(props);

    const { brsApi, save } = props;
    const reportManager = new ReportManager(
      this.logMessage,
      this.logConfigurationErrors
    );
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

  logConfigurationErrors = (errorMessages: string[]) => {
    const logItems = errorMessages.map((title) => ({ title, colored: true }));
    this.setState({ logItems });
  };

  logMessage = async (report: BrsReport) => {
    const logItems = await this.reportToNestedListItems(report);
    this.setState({ logItems });
  };

  reportToNestedListItems(report: BrsReport): Promise<NestedItem[]> {
    const logItems = this.state.logItems;
    return new Promise((resolve) => {
      const disciplineConfig = report.disciplineConfig;
      const disciplineTime =
        disciplineConfig.termType === TermType.Fall
          ? `осень ${disciplineConfig.year}`
          : disciplineConfig.termType === TermType.Spring
          ? `весна ${disciplineConfig.year + 1}`
          : `${disciplineConfig.year}/${disciplineConfig.year + 1}`;
      let title = `Группа ${report.discipline.group} (${disciplineTime}, ${disciplineConfig.course} курс)`;

      const nestedItems: NestedItem[] = [];
      const mainItem: NestedItem = { title, collapsed: true, nestedItems };

      let hasErrors = false;

      const merge = report.merge;
      let mergeResultsTitle = `Сопоставление: ${merge.succeed} успешно`;
      const failedActualCount = merge.failedActual?.length || 0;
      mergeResultsTitle += `, ${failedActualCount} ${pluralize(
        failedActualCount,
        "неизвестный",
        "неизвестных",
        "неизвестных"
      )} в таблице`;
      const failedBrsCount = merge.failedBrs?.length || 0;
      mergeResultsTitle += `, ${failedBrsCount} ${pluralize(
        failedBrsCount,
        "неизвестный",
        "неизвестных",
        "неизвестных"
      )} в БРС`;

      const mergeInfoItem: NestedItem = {
        title: mergeResultsTitle,
        nestedItems: [],
        collapsed: true,
      };
      nestedItems.push(mergeInfoItem);

      if (!!merge.failedActual) {
        hasErrors = true;
        title = `Не удалось сопоставить ${
          merge.failedActual.length
        } ${pluralize(
          merge.failedActual.length,
          "студента",
          "студентов",
          "студентов"
        )} из Google Таблицы`;
        mergeInfoItem.nestedItems?.push({
          title,
          nestedItems: merge.failedActual.map((s) => ({ title: s })),
          colored: true,
          collapsed: false,
          renderAsText: true,
        });
      }
      if (!!merge.failedBrs) {
        hasErrors = true;
        title = `Не удалось сопоставить ${merge.failedBrs.length} ${pluralize(
          merge.failedBrs.length,
          "студента",
          "студентов",
          "студентов"
        )} из БРС`;
        mergeInfoItem.nestedItems?.push({
          title,
          nestedItems: merge.failedBrs.map((s) => ({ title: s })),
          colored: true,
          collapsed: false,
          renderAsText: true,
        });
      }

      const marks = report.marks;
      const marksItem: NestedItem = {
        title: "Выставление баллов",
        collapsed: true,
      };
      marksItem.nestedItems = marks.map(({ title, students, failed }) => ({
        title: `${title}: ${students?.length ?? 0} ${pluralize(
          students?.length ?? 0,
          "студент",
          "студента",
          "студентов"
        )}`,
        nestedItems: students?.map((s) => ({ title: s })),
        colored: !!failed,
        collapsed: false,
        renderAsText: true,
      }));
      nestedItems.push(marksItem);
      hasErrors =
        hasErrors || marks.filter(({ failed }) => !!failed).length > 0;

      const skipped = report.skipped;
      if (skipped.length > 0) {
        const skippedItem: NestedItem = {
          title: "Неизвестные студенты из БРС",
          collapsed: true,
        };
        skippedItem.nestedItems = skipped.map(({ title, students }) => ({
          title: `${title}: ${students?.length ?? 0} ${pluralize(
            students?.length ?? 0,
            "студент",
            "студента",
            "студентов"
          )}`,
          nestedItems: students?.map((s) => ({ title: s })),
          collapsed: false,
          renderAsText: true,
        }));
        nestedItems.push(skippedItem);
      }

      if (hasErrors) {
        mainItem.colored = true;
      }
      logItems.push(mainItem);

      resolve(logItems);
    });
  }

  startWork = async () => {
    for (const marksData of this.props.marksDatas) {
      const { spreadsheetData, suitableDisciplines } = marksData;

      const error = await this.marksManager.putMarksToBrsAsync(
        spreadsheetData,
        suitableDisciplines
      );

      if (error) {
        if (typeof error === "object") {
          this.props.onError(error.toString());
        } else if (typeof error === "string") {
          this.props.onError(error);
        }
      }
    }

    this.setState({
      cancelPending: false,
      okLoading: false,
    });
  };

  cancelWork = () => {
    this.setState({ cancelPending: true });
    this.marksManager.cancel();
  };

  render() {
    return (
      <React.Fragment>
        <Dialog open={true} maxWidth="md" fullWidth className="worker-dialog">
          <MuiDialogTitle>Журнал действий</MuiDialogTitle>
          <DialogContent dividers>
            <NestedList items={this.state.logItems} />
          </DialogContent>
          <DialogActions>
            <SubmitWithLoading
              loading={this.state.okLoading}
              onClick={this.props.onClosed}
              title="ок"
            />
            <SubmitWithLoading
              loading={this.state.cancelPending}
              disabled={!this.state.okLoading}
              onClick={this.cancelWork}
              title="отмена"
            />
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
  marksDatas: MarksData[];
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
