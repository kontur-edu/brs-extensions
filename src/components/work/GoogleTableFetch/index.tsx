import React, {memo} from "react";
import SpreadsheetManager, {DisciplineConfig, SpreadsheetData} from "../../../managers/SpreadsheetManager";
import NestedList, {NestedItem} from "../../shared/NestedList";
import {Collapse, Container} from "@material-ui/core";
import {compareNormalized} from '../../../helpers/tools';
import {getSpreadsheetProperties} from "../../../apis/GoogleApi";
import BrsApi, {Discipline} from "../../../apis/BrsApi";
import './styles.css';
import RunWorkerButtons from "../RunWorkerButtons";
import WorkerDialog, {MarksData} from "../WorkerDialog";
import GroupIcon from '@material-ui/icons/Group';
import {ViewModule} from "@material-ui/icons";
import GoogleTableFetchForm from "./GoogleTableFetchForm";

class GoogleTableFetch extends React.Component<Props, State> {
    marksData: MarksData = {} as any;
    workerSaveMode: boolean = false;
    spreadsheetId: string = '';
    sheetId: string | null = null;

    constructor(props: Props) {
        super(props);

        this.state = {
            tableUrl: '',
            loading: false,
            showDisciplines: false,
            tableUrlError: {error: false, message: ''},
            disciplines: [],
            disciplinesMissed: false,
            showWorkerButtons: false,
            runWorker: false
        };

    }

    loadDisciplines = async (spreadsheetId: string, sheetId: string | null) => {
        this.spreadsheetId = spreadsheetId;
        this.sheetId = sheetId;

        this.setState({loading: true});

        const spreadsheetData = await this.getActualSpreadsheetDataAsync(spreadsheetId, sheetId);
        if (!spreadsheetData) {
            this.setState({loading: false});
            return;
        }

        const disciplines = await this.getActualDisciplinesAsync(spreadsheetData.disciplineConfig);
        if (!disciplines) {
            this.setState({loading: false});
            return;
        }

        const disciplinesInfo = this.disciplinesToListItems(disciplines, spreadsheetData);

        this.marksData.spreadsheetData = spreadsheetData;
        this.marksData.suitableDisciplines = disciplines;

        this.setState({
            loading: false,
            disciplines: disciplinesInfo.disciplines,
            showDisciplines: true,
            disciplinesMissed: disciplinesInfo.missed,
            showWorkerButtons: !disciplinesInfo.missed
        });
    }

    disciplinesToListItems(availableDisciplines: Discipline[], spreadsheetData: SpreadsheetData)
        : { missed: boolean, disciplines: NestedItem[] } {

        const actualGroups = new Set(spreadsheetData.actualStudents.map(s => s.groupName));
        const availableGroups = new Set(availableDisciplines.map(s => s.group));

        let missedCount = 0;
        const nestedItems: NestedItem[] = Array.from(actualGroups)
            .map(group => {
                const groupMissed = !availableGroups.has(group);
                if (groupMissed)
                    missedCount++;
                return {title: group, colored: groupMissed};
            });

        return {
            missed: missedCount === actualGroups.size,
            disciplines: [{
                title: spreadsheetData.disciplineConfig.name,
                nestedItems
            }]
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
        
            return allDisciplines.filter(d => compareNormalized(d.discipline, disciplineConfig.name));
        } catch (error) {
            this.props.onError(error);
        }
    }

    async getActualSpreadsheetDataAsync(spreadsheetId: string, sheetId: string | null) {
        const sheetName = await this.getSheetName(spreadsheetId, sheetId);
        if (!sheetName) {
            return null;
        }

        let spreadsheetData: SpreadsheetData;
        try {
            const spreadsheetManager = new SpreadsheetManager(spreadsheetId);
            spreadsheetData = await spreadsheetManager.getSpreadsheetDataAsync(sheetName);
        } catch (e) {
            this.props.onError(e.message || JSON.stringify(e));
            return null;
        }

        return spreadsheetData;
    }

    async getSheetName(spreadsheetId: string, sheetId: string | null): Promise<string | null> {
        try {
            const spreadsheetProperties = await getSpreadsheetProperties(spreadsheetId);
            const maybeSheet = sheetId
                ? spreadsheetProperties.filter(s => s.sheetId.toString() === sheetId)[0]
                : spreadsheetProperties[0];
            if (!maybeSheet) {
                this.props.onError('Таблица не найдена');
                return null;
            }
            return maybeSheet.title;
        } catch (e) {
            this.props.onError(e.message || JSON.stringify(e));
            return null;
        }
    }

    updateCachedDisciplines = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        event.preventDefault();
        this.setState({showDisciplines: false});

        const disciplineConfig = this.marksData.spreadsheetData?.disciplineConfig;
        if (!disciplineConfig)
            return;

        this.props.brsApi.clearDisciplineCacheAsync(
            disciplineConfig.year,
            disciplineConfig.termType,
            disciplineConfig.course,
            disciplineConfig.isModule)
            .then(x => x, error => {
                this.props.onError(error)
            });

        this.loadDisciplines(this.spreadsheetId, this.sheetId);
    }

    runWork = (save: boolean) => {
        this.workerSaveMode = save;
        this.setState({runWorker: true});
    }

    handleRunWorkSafe = () => this.runWork(false)

    handleRunWorkUnsafe = () => this.runWork(true)

    handleWorkerClosed = () => this.setState({runWorker: false})

    render() {
        return (
            <span className={'spreadsheet-fetch'}>
                <h3 className={'vertical-margin-min'}>Вставьте ссылку на лист Google Таблицы с оценками</h3>
                <GoogleTableFetchForm loading={this.state.loading} onSubmit={this.loadDisciplines}/>

                <Collapse in={this.state.showDisciplines} className={"vertical-margin-min"}>
                    <h3>Загруженная дисциплина из Google Таблицы</h3>
                    <p>Группы, к которым у вас нет доступа в БРС, <b className={"colored-text"}> подсвечены</b></p>

                    <NestedList items={this.state.disciplines} icons={[<ViewModule/>, <GroupIcon/>]}/>

                    {this.state.disciplinesMissed ?
                        <React.Fragment>
                            <p>У вас нет доступа ни к одной из перечисленных групп в БРС</p>
                            <span>Возможные действия:</span>
                            <ol className={"no-margin"}>
                                <li>Убедитесь, что название дисциплины в БРС и в Google Таблицах совпадает</li>
                                <li>Запросите доступ на дисциплину в БРС</li>
                                <li><a className={"button-link"}
                                       onClick={this.updateCachedDisciplines}>Обновите кэш групп</a></li>
                            </ol>
                        </React.Fragment> :
                        <React.Fragment>
                            <p>Если вам доступны не все группы, которые вам доступны в БРС, то <a
                                className={"button-link"}
                                onClick={this.updateCachedDisciplines}>обновите кэш групп</a>
                            </p>
                            <Container className={"vertical-margin-medium"}>
                                <RunWorkerButtons enabled={this.state.showWorkerButtons}
                                                  onRunWorkSafe={this.handleRunWorkSafe}
                                                  onRunWorkUnsafe={this.handleRunWorkUnsafe}/>
                            </Container>
                        </React.Fragment>
                    }
                </Collapse>
                {this.state.runWorker &&
                <WorkerDialog marksData={this.marksData}
                              onClosed={this.handleWorkerClosed}
                              brsApi={this.props.brsApi}
                              onError={this.props.onError}
                              save={this.workerSaveMode}/>
                }
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
    tableUrlError: { error: boolean, message: string };
    disciplines: NestedItem[];
    disciplinesMissed: boolean;
    showWorkerButtons: boolean;
    runWorker: boolean;
}
