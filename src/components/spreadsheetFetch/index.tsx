import React, {FormEvent, memo} from "react";
import getSpreadsheetDataAsync, {DisciplineConfig, SpreadsheetData} from "../../functions/getSpreadsheetDataAsync";
import NestedList, {INestedItem, INestedListItem} from "../nestedList";
import {Collapse, TextField} from "@material-ui/core";
import SubmitWithLoading from "../submitWithLoading";
import {getSpreadsheetProperties} from "../../apis/googleApi";
import getSuitableDisciplinesAsync from "../../functions/getSuitableDisciplinesAsync";
import BrsApi, {Discipline} from "../../apis/brsApi";
import * as cache from "../../helpers/cache"
import {StorageType} from "../../helpers/cache"
import './styles.css';
import catchOrReturn from "../../helpers/catchOrReturn";
import RunWorkerButtons from "../workPage/worker/RunWorkerButtons";
import WorkerDialog, {MarksData} from "../workPage/worker/workerDialog";
import MarksManager, {PutMarksOptions} from "../../marksActions/MarksManager";
import {Logger} from "../../helpers/logger";

class SpreadsheetFetch extends React.Component<Props, State> {
    marksData: MarksData = {} as any;
    marksManager: MarksManager = {} as any;

    constructor(props: Props) {
        super(props);

        // const items = Array(10).fill({title: "Text", colored: true});
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

    handleTableUrlChanged = (event: React.ChangeEvent<{ name?: string | undefined, value: unknown }>) => {
        const target = event.target;
        switch (target.name) {
            case 'table-url':
                if (this.state.tableUrlError.error)
                    this.setState({tableUrlError: {error: false, message: ''}});
                this.setState({tableUrl: target.value as string});
        }
    }

    loadDisciplines = async (e?: FormEvent) => {
        e?.preventDefault();
        this.setState({loading: true});

        const spreadsheetData = await this.getActualSpreadsheetDataAsync();
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
        const nestedItems: INestedItem[] = Array.from(actualGroups)
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

    async getActualSpreadsheetDataAsync() {
        const spreadsheetInfo = await this.getSpreadsheetInfoAsync();
        if (!spreadsheetInfo) {
            this.setState({loading: false});
            return null;
        }

        let spreadsheetData: SpreadsheetData;
        try {
            spreadsheetData = await getSpreadsheetDataAsync(spreadsheetInfo.spreadsheetId, spreadsheetInfo.sheetName);
        } catch (e) {
            this.setState({loading: false})
            this.props.onError(e.message || JSON.stringify(e));
            return null;
        }

        return spreadsheetData;
    }

    async getSpreadsheetInfoAsync(): Promise<{ spreadsheetId: string, sheetName: string } | null> {
        const regExp = /d\/(?<spreadsheetId>[a-zA-Z0-9-_]+)\/edit(#gid=(?<sheetId>[0-9]+))?/;
        const result = this.state.tableUrl.match(regExp);

        if (!result?.groups || !result.groups.spreadsheetId) {
            this.setState({
                loading: false,
                tableUrlError: {error: true, message: 'Неверный url-адрес.'}
            });
            return null;
        }
        const spreadsheetId = result.groups.spreadsheetId;
        const maybeSheetId = result.groups.sheetId || null;

        try {
            const spreadsheetProperties = await getSpreadsheetProperties(spreadsheetId);
            const maybeSheet = maybeSheetId
                ? spreadsheetProperties.filter(s => s.sheetId.toString() === maybeSheetId)[0]
                : spreadsheetProperties[0];
            if (!maybeSheet) {
                this.props.onError('Sheet is not found');
                return null;
            }
            const sheetName = maybeSheet.title;
            return {spreadsheetId, sheetName};
        } catch (e) {
            this.props.onError(e.message || JSON.stringify(e));
            return null;
        }
    }

    updateCachedDisciplines = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        event.preventDefault();
        this.setState({showWorkerButtons: false})

        const login = catchOrReturn(() => this.props.brsApi.brsAuth.login, this.props.onError);
        if (!login)
            return;

        const disciplineConfig = this.marksData.spreadsheetData?.disciplineConfig;
        if (!disciplineConfig)
            return;

        const cacheName = cache.buildCacheName(login, "getDiscipline", disciplineConfig);
        cache.clear(cacheName, StorageType.Local);

        this.loadDisciplines();
    }

    runWork = (save: boolean) => {
        const logger = new Logger();
        logger.addErrorHandler(this.props.onError);

        const options: PutMarksOptions = {save, verbose: true};

        this.marksManager = new MarksManager(this.props.brsApi, logger, options);

        this.setState({runWorker: true});
    }

    handleRunWorkSafe = () => this.runWork(false)

    handleRunWorkUnsafe = () => this.runWork(true)

    handleWorkerClosed = () => this.setState({runWorker: false})

    render() {
        return (
            <span className={'spreadsheet-fetch'}>
                <h3 className={'vertical-margin-min'}>Вставь ссылку на лист Google Таблицы с оценками</h3>
                <form onSubmit={this.loadDisciplines} className={'vertical-margin-min'}>
                    <TextField name="table-url"
                               label="Ссылка"
                               type="text"
                               className={'tableUrl'}
                               value={this.state.tableUrl}
                               onChange={this.handleTableUrlChanged}
                               error={this.state.tableUrlError.error}
                               helperText={this.state.tableUrlError.message}
                               required/>
                    <SubmitWithLoading title="загрузить"
                                       loading={this.state.loading}
                                       className={'submit'}/>
                </form>
                <Collapse in={this.state.showDisciplines} className={"vertical-margin-min"}>
                    <h3>Загруженная дисциплина из Google Таблицы</h3>
                    <p>Группы, к которым у Вас нет доступа в БРС, подсвеченны
                        <b className={"colored-text"}> красным</b></p>
                    <NestedList items={this.state.disciplines} collapsed={false}/>
                    {this.state.disciplinesMissed ?
                        <React.Fragment>
                            <span>У вас нет доступа ни к одной из перечисленных групп в БРС</span>
                            <ol className={"no-margin"}>
                                <li>Убедитесь, что название курса в БРС и в Google Таблицах совпадает</li>
                                <li>Запросите доступ на курс в БРС</li>
                                <li><a className={"button-link"}
                                       onClick={this.updateCachedDisciplines}>Обновите кэш групп</a></li>
                            </ol>
                        </React.Fragment> :
                        <React.Fragment>
                            <p>Если вам доступны не все группы, которые вам доступны в БРС, то <a
                                className={"button-link"}
                                aria-disabled={true}
                                onClick={this.updateCachedDisciplines}>обновите кэш групп</a>
                            </p>
                            <RunWorkerButtons enabled={this.state.showWorkerButtons}
                                              onRunWorkSafe={this.handleRunWorkSafe}
                                              onRunWorkUnsafe={this.handleRunWorkUnsafe}/>
                        </React.Fragment>
                    }
                </Collapse>
                {this.state.runWorker &&
                <WorkerDialog marksData={this.marksData}
                              onClosed={this.handleWorkerClosed}
                              runWork={this.state.runWorker}
                              marksManager={this.marksManager}/>
                }
            </span>
        );
    }
}

export default memo(SpreadsheetFetch);

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
