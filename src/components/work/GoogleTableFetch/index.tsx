import React, { memo } from "react";
import SpreadsheetManager, {
  DisciplineConfig,
  SpreadsheetData,
  SpreadsheetDatas,
} from "../../../managers/SpreadsheetManager";
import NestedList, { NestedItem } from "../../shared/NestedList";
import { Collapse, Container } from "@material-ui/core";
import {
  compareNormalized,
  filterNull,
  normalizeString,
} from "../../../helpers/tools";
import * as googleApi from "../../../apis/GoogleApi";
import BrsApi, { Discipline, TermType } from "../../../apis/BrsApi";
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
  marksDatas: Array<MarksData> = [];
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

    const spreadsheetDatas = await this.getActualSpreadsheetDataAsync(
      spreadsheetId,
      sheetId
    );
    if (!spreadsheetDatas?.datas || spreadsheetDatas.datas.length === 0) {
      this.setState({ loading: false });
      return false;
    }

    this.marksDatas = [];
    const nestedItems: NestedItem[] = [];
    let allMissed = true;
    let missedCount = 0;
    for (const data of spreadsheetDatas.datas) {
      const disciplines = await this.getActualDisciplinesAsync(
        data.disciplineConfig
      );
      if (!disciplines) {
        this.setState({ loading: false });
        return false;
      }
      this.marksDatas.push({
        spreadsheetData: data,
        suitableDisciplines: disciplines,
      });

      const items = this.disciplinesToListItems(disciplines, data);
      allMissed = allMissed && items.allMissed;
      missedCount += items.missedCount;
      nestedItems.push(...items.disciplines);
    }

    this.setState({
      loading: false,
      disciplines: nestedItems,
      showDisciplines: true,
      lastAction: LastAction.LoadDisciplines,
      allDisciplinesMissed: allMissed,
      missedDisciplinesCount: missedCount,
      showWorkerButtons: !allMissed,
    });

    return !allMissed;
  };

  disciplinesToListItems(
    availableDisciplines: Discipline[],
    spreadsheetData: SpreadsheetData
  ): { allMissed: boolean; missedCount: number; disciplines: NestedItem[] } {
    const actualGroups = Array.from(
      new Set(spreadsheetData.actualStudents.map((s) => s.groupName || ""))
    );
    const availableGroups = Array.from(
      new Set(availableDisciplines.map((s) => s.group))
    );

    let missedCount = 0;
    const nestedItems: NestedItem[] = actualGroups
      .map((group) => {
        if (group.length > 0) {
          const normalizedGroup = normalizeString(group);
          const availableForActual = availableGroups.filter((it) =>
            normalizeString(it).startsWith(normalizedGroup)
          );

          if (availableForActual.length === 0) {
            missedCount++;
            return [{ title: group, colored: true }];
          } else {
            return availableForActual.map((it) => ({
              title: it,
              colored: false,
            }));
          }
        } else {
          if (availableGroups.length === 0) {
            missedCount++;
            return [{ title: 'Автоопределение → нет вариантов', colored: true }];
          } else {
            return availableGroups.map((it) => ({
              title: `Автоопределение → ${it}`,
              colored: false,
            }));
          }
        }
      })
      .flat();

    const disciplineConfig = spreadsheetData.disciplineConfig;
    const disciplineTime =
      disciplineConfig.termType === TermType.Fall
        ? `осень ${disciplineConfig.year}`
        : disciplineConfig.termType === TermType.Spring
        ? `весна ${disciplineConfig.year + 1}`
        : `${disciplineConfig.year}/${disciplineConfig.year + 1}`;
    const disciplineTitle = `${disciplineConfig.name}, ${disciplineTime}, ${disciplineConfig.course} курс`;
    return {
      allMissed: missedCount === actualGroups.length,
      missedCount,
      disciplines: [
        {
          title: disciplineTitle,
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
    } catch (error: any) {
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

    let spreadsheetData: SpreadsheetDatas;
    try {
      const spreadsheetManager = new SpreadsheetManager(spreadsheetId);
      spreadsheetData = await spreadsheetManager.getSpreadsheetDataAsync(
        sheetName
      );
    } catch (e: any) {
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
      const meta = await googleApi.getSpreadsheet(spreadsheetId).getMetaAsync();
      const sheets = meta.sheets.map((it) => it.properties);
      const maybeSheet = sheetId
        ? sheets.filter((s) => s.sheetId.toString() === sheetId)[0]
        : sheets[0];
      if (!maybeSheet) {
        this.props.onError("Таблица не найдена");
        return null;
      }
      return maybeSheet.title;
    } catch (e: any) {
      this.props.onError(e.message || JSON.stringify(e));
      return null;
    }
  }

  updateCachedDisciplines = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.preventDefault();
    this.setState({ showDisciplines: false });

    for (const marksData of this.marksDatas) {
      const disciplineConfig = marksData.spreadsheetData?.disciplineConfig;
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
    }

    this.loadDisciplines(this.spreadsheetId, this.sheetId);
  };

  runWork = async (save: boolean) => {
    if (this.state.lastAction !== LastAction.LoadDisciplines) {
      const success = await this.loadDisciplines(
        this.spreadsheetId,
        this.sheetId
      );
      if (!success) {
        return;
      }
    }

    this.workerSaveMode = save;
    this.setState({
      lastAction: LastAction.RunWork,
      runWorker: true,
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
          <h3>Загруженные дисциплины из Google Таблицы</h3>
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
            marksDatas={this.marksDatas}
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
