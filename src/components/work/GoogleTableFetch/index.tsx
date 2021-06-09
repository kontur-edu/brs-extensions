import React, { memo } from "react";
import SpreadsheetManager, {
  DisciplineConfig,
  SpreadsheetData,
} from "../../../managers/SpreadsheetManager";
import NestedList, { NestedItem } from "../../shared/NestedList";
import { Collapse, Container } from "@material-ui/core";
import { compareNormalized } from "../../../helpers/tools";
import { getSpreadsheetProperties } from "../../../apis/GoogleApi";
import BrsApi, { Discipline } from "../../../apis/BrsApi";
import "./styles.css";
import RunWorkerButtons from "../RunWorkerButtons";
import WorkerDialog, { MarksData } from "../WorkerDialog";
import GroupIcon from "@material-ui/icons/Group";
import { ViewModule } from "@material-ui/icons";
import GoogleTableFetchForm from "./GoogleTableFetchForm";

enum LastAction {
  None,
  LoadDisciplines,
  RunWork,
}

class GoogleTableFetch extends React.Component<Props, State> {
  marksData: MarksData = {} as any;
  workerSaveMode: boolean = false;
  spreadsheetId: string = "";
  sheetId: string | null = null;

  constructor(props: Props) {
    super(props);

    this.state = {
      tableUrl: "",
      loading: false,
      showDisciplines: false,
      lastAction: LastAction.None,
      tableUrlError: { error: false, message: "" },
      disciplines: [],
      allDisciplinesMissed: false,
      missedDisciplinesCount: 0,
      showWorkerButtons: false,
      runWorker: false,
    };
  }

  loadDisciplines = async (spreadsheetId: string, sheetId: string | null) => {
    this.spreadsheetId = spreadsheetId;
    this.sheetId = sheetId;

    this.setState({ loading: true });

    const spreadsheetData = await this.getActualSpreadsheetDataAsync(
      spreadsheetId,
      sheetId
    );
    if (!spreadsheetData) {
      this.setState({ loading: false });
      return false;
    }

    const disciplines = await this.getActualDisciplinesAsync(
      spreadsheetData.disciplineConfig
    );
    if (!disciplines) {
      this.setState({ loading: false });
      return false;
    }

    const disciplinesInfo = this.disciplinesToListItems(
      disciplines,
      spreadsheetData
    );

    this.marksData.spreadsheetData = spreadsheetData;
    this.marksData.suitableDisciplines = disciplines;

    this.setState({
      loading: false,
      disciplines: disciplinesInfo.disciplines,
      showDisciplines: true,
      lastAction: LastAction.LoadDisciplines,
      allDisciplinesMissed: disciplinesInfo.allMissed,
      missedDisciplinesCount: disciplinesInfo.missedCount,
      showWorkerButtons: !disciplinesInfo.allMissed,
    });

    return !disciplinesInfo.allMissed;
  };

  disciplinesToListItems(
    availableDisciplines: Discipline[],
    spreadsheetData: SpreadsheetData
  ): { allMissed: boolean; missedCount: number; disciplines: NestedItem[] } {
    const actualGroups = new Set(
      spreadsheetData.actualStudents.map((s) => s.groupName)
    );
    const availableGroups = new Set(availableDisciplines.map((s) => s.group));

    let missedCount = 0;
    const nestedItems: NestedItem[] = Array.from(actualGroups).map((group) => {
      const groupMissed = !availableGroups.has(group);
      if (groupMissed) missedCount++;
      return { title: group, colored: groupMissed };
    });

    return {
      allMissed: missedCount === actualGroups.size,
      missedCount,
      disciplines: [
        {
          title: spreadsheetData.disciplineConfig.name,
          nestedItems,
        },
      ],
    };
  }

  async getActualDisciplinesAsync(disciplineConfig: DisciplineConfig) {
    try {
      const allDisciplines = await this.props.brsApi.getDisciplineCachedAsync(
        disciplineConfig.year,
        disciplineConfig.termType,
        disciplineConfig.course,
        disciplineConfig.isModule
      );

      return allDisciplines.filter((d) =>
        compareNormalized(d.discipline, disciplineConfig.name)
      );
    } catch (error) {
      this.props.onError(error);
    }
  }

  async getActualSpreadsheetDataAsync(
    spreadsheetId: string,
    sheetId: string | null
  ) {
    const sheetName = await this.getSheetName(spreadsheetId, sheetId);
    if (!sheetName) {
      return null;
    }

    let spreadsheetData: SpreadsheetData;
    try {
      const spreadsheetManager = new SpreadsheetManager(spreadsheetId);
      spreadsheetData = await spreadsheetManager.getSpreadsheetDataAsync(
        sheetName
      );
    } catch (e) {
      this.props.onError(e.message || JSON.stringify(e));
      return null;
    }

    return spreadsheetData;
  }

  async getSheetName(
    spreadsheetId: string,
    sheetId: string | null
  ): Promise<string | null> {
    try {
      const spreadsheetProperties = await getSpreadsheetProperties(
        spreadsheetId
      );
      const maybeSheet = sheetId
        ? spreadsheetProperties.filter(
            (s) => s.sheetId.toString() === sheetId
          )[0]
        : spreadsheetProperties[0];
      if (!maybeSheet) {
        this.props.onError("Таблица не найдена");
        return null;
      }
      return maybeSheet.title;
    } catch (e) {
      this.props.onError(e.message || JSON.stringify(e));
      return null;
    }
  }

  updateCachedDisciplines = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.preventDefault();
    this.setState({ showDisciplines: false });

    const disciplineConfig = this.marksData.spreadsheetData?.disciplineConfig;
    if (!disciplineConfig) return;

    this.props.brsApi
      .clearDisciplineCacheAsync(
        disciplineConfig.year,
        disciplineConfig.termType,
        disciplineConfig.course,
        disciplineConfig.isModule
      )
      .then(
        (x) => x,
        (error) => {
          this.props.onError(error);
        }
      );

    this.loadDisciplines(this.spreadsheetId, this.sheetId);
  };

  runWork = async (save: boolean) => {
    if (this.state.lastAction !== LastAction.LoadDisciplines) {
      const success = await this.loadDisciplines(this.spreadsheetId, this.sheetId);
      if (!success) {
        return;
      }
    }

    this.workerSaveMode = save;
    this.setState({
      lastAction: LastAction.RunWork,
      runWorker: true
    });
  };

  handleRunWorkSafe = () => this.runWork(false);

  handleRunWorkUnsafe = () => this.runWork(true);

  handleWorkerClosed = () => this.setState({ runWorker: false });

  render() {
    return (
      <span className="spreadsheet-fetch">
        <h3 className="vertical-margin-min">
          Вставьте ссылку на лист Google Таблицы с оценками
        </h3>
        <GoogleTableFetchForm
          loading={this.state.loading}
          onSubmit={this.loadDisciplines}
        />

        <Collapse
          in={this.state.showDisciplines}
          className="vertical-margin-min"
        >
          <h3>Загруженная дисциплина из Google Таблицы</h3>
          {this.state.missedDisciplinesCount > 0 && (
            <p>
              Группы, к которым у вас нет доступа в БРС,{" "}
              <b className="colored-text"> подсвечены</b>
            </p>
          )}

          <NestedList
            items={this.state.disciplines}
            icons={[<ViewModule />, <GroupIcon />]}
          />

          {this.state.allDisciplinesMissed ? (
            <React.Fragment>
              <p>У вас нет доступа ни к одной из перечисленных групп в БРС</p>
              <span>Возможные действия:</span>
              <ol className="no-margin">
                <li>
                  Убедитесь, что название дисциплины в БРС и в Google Таблицах
                  совпадает
                </li>
                <li>Запросите доступ на дисциплину в БРС</li>
                <li>Убедитесь, что техкарта согласована в БРС</li>
                <li>
                  <button
                    className="button-link"
                    onClick={this.updateCachedDisciplines}
                  >
                    Обновите кэш групп
                  </button>
                </li>
              </ol>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <p>
                Если вам доступны не все группы, которые вам доступны в БРС, то{" "}
                <button
                  className="button-link"
                  onClick={this.updateCachedDisciplines}
                >
                  обновите кэш групп
                </button>
              </p>
              <Container className="vertical-margin-medium">
                <RunWorkerButtons
                  enabled={this.state.showWorkerButtons}
                  onRunWorkSafe={this.handleRunWorkSafe}
                  onRunWorkUnsafe={this.handleRunWorkUnsafe}
                />
              </Container>
            </React.Fragment>
          )}
        </Collapse>
        {this.state.runWorker && (
          <WorkerDialog
            marksData={this.marksData}
            onClosed={this.handleWorkerClosed}
            brsApi={this.props.brsApi}
            onError={this.props.onError}
            save={this.workerSaveMode}
          />
        )}
      </span>
    );
  }
}

export default memo(GoogleTableFetch);

interface Props {
  brsApi: BrsApi;
  onError: (errorMessage: string) => void;
}

interface State {
  tableUrl: string;
  loading: boolean;
  showDisciplines: boolean;
  lastAction: LastAction;
  tableUrlError: { error: boolean; message: string };
  disciplines: NestedItem[];
  allDisciplinesMissed: boolean;
  missedDisciplinesCount: number;
  showWorkerButtons: boolean;
  runWorker: boolean;
}
