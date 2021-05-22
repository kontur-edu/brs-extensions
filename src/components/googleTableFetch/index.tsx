import React, {memo} from "react";
import getSpreadsheetDataAsync, {DisciplineConfig, SpreadsheetData} from "../../functions/getSpreadsheetDataAsync";
import NestedList, {INestedListItem} from "../nestedList";
import {Collapse, Container} from "@material-ui/core";
import {getSpreadsheetProperties} from "../../apis/googleApi";
import getSuitableDisciplinesAsync from "../../functions/getSuitableDisciplinesAsync";
import BrsApi, {Discipline} from "../../apis/brsApi";
import * as cache from "../../helpers/cache"
import {StorageType} from "../../helpers/cache"
import './styles.css';
import tryInvoke from "../../helpers/tryInvoke";
import RunWorkerButtons from "../workPage/worker/RunWorkerButtons";
import WorkerDialog, {MarksData} from "../workPage/worker/workerDialog";
import GroupIcon from '@material-ui/icons/Group';
import {ViewModule} from "@material-ui/icons";
import GoogleTableFetchForm from "./googleTableFetchForm";

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
        if (!spreadsheetData)
            return;

        const availableDisciplines = await this.getAvailableDisciplinesAsync(spreadsheetData.disciplineConfig);
        if (!availableDisciplines)
            return;

        const disciplinesInfo = this.disciplinesToListItems(availableDisciplines, spreadsheetData);

        this.marksData.spreadsheetData = spreadsheetData;
        this.marksData.suitableDisciplines = availableDisciplines;

        this.setState({
            loading: false,
            disciplines: disciplinesInfo.disciplines,
            showDisciplines: true,
            disciplinesMissed: disciplinesInfo.missed,
            showWorkerButtons: !disciplinesInfo.missed
        });
    }

    disciplinesToListItems(availableDisciplines: Discipline[], spreadsheetData: SpreadsheetData)
        : { missed: boolean, disciplines: INestedListItem[] } {

        const actualGroups = new Set(spreadsheetData.actualStudents.map(s => s.groupName));
        const availableGroups = new Set(availableDisciplines.map(s => s.group));

        let missedCount = 0;
        const nestedItems: INestedListItem[] = Array.from(actualGroups)
            .map(group => {
                const groupMissed = !availableGroups.has(group);
                if (groupMissed)
                    missedCount++;
                return {title: group, colored: groupMissed};
            });

        return {
            missed: missedCount == actualGroups.size,
            disciplines: [{
                title: spreadsheetData.disciplineConfig.name,
                nestedItems
            }]
        };
    }

    async getAvailableDisciplinesAsync(disciplineConfig: DisciplineConfig) {
        return getSuitableDisciplinesAsync(this.props.brsApi, disciplineConfig)
            .then(x => x, error => {
                this.setState({loading: false})
                this.props.onError(error)
            });
    }

    async getActualSpreadsheetDataAsync(spreadsheetId: string, sheetId: string | null) {
        const sheetName = await this.getSheetName(spreadsheetId, sheetId);
        if (!sheetName) {
            this.setState({loading: false});
            return null;
        }

        let spreadsheetData: SpreadsheetData;
        try {
            spreadsheetData = await getSpreadsheetDataAsync(spreadsheetId, sheetName);
        } catch (e) {
            this.setState({loading: false})
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

        const userCacheName = tryInvoke(() => this.props.brsApi.brsAuth.cacheName, this.props.onError);
        if (!userCacheName)
            return;

        const disciplineConfig = this.marksData.spreadsheetData?.disciplineConfig;
        if (!disciplineConfig)
            return;

        const cacheName = cache.buildCacheName(userCacheName, "getDiscipline", disciplineConfig);
        cache.clear(cacheName, StorageType.Local);

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
    disciplines: INestedListItem[];
    disciplinesMissed: boolean;
    showWorkerButtons: boolean;
    runWorker: boolean;
}
