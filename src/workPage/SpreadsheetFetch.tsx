import React, {FormEvent} from "react";
import buildMarksAutoAsync, {MarksData} from "../functions/buildMarksAutoAsync";
import NestedList, {NestedListItem} from "../components/NestedList";
import Collapse from "@material-ui/core/Collapse";
import SubmitWithLoading from "../components/SubmitWithLoading";
import TextField from "@material-ui/core/TextField";
import './spreadsheet-fetch.css';

export default class SpreadsheetFetch extends React.Component<Props, State> {
    tableUrl = '';

    constructor(props: Props) {
        super(props);

        this.state = {
            loading: false,
            tableUrlError: {error: false, message: ''},
            moduleGroups: []
        };

        this.handleChange = this.handleChange.bind(this);
        this.loadTable = this.loadTable.bind(this);
    }

    handleChange(event: React.ChangeEvent<{ name?: string | undefined, value: unknown }>) {
        const target = event.target;
        switch (target.name) {
            case 'table-url':
                if (this.state.tableUrlError.error)
                    this.setState({tableUrlError: {error: false, message: ''}});
                this.tableUrl = target.value as string;
        }
    }

    prepareModuleGroup(marksData: MarksData): NestedListItem {
        const groups = marksData.actualStudents.map(s => s.groupName);
        return {
            title: marksData.disciplineConfig.name,
            nestedItems: Array.from(new Set(groups))
        }
    }

    async loadTable(e: FormEvent) {
        e.preventDefault();
        this.setState({loading: true});

        const spreadsheetInfo = await this.getSpreadsheetInfo();
        if (!spreadsheetInfo)
            return;

        let marksData: MarksData;
        try {
            marksData = await buildMarksAutoAsync(spreadsheetInfo.spreadsheetId, spreadsheetInfo.sheetName);
        } catch (e) {
            this.setState({loading: false})
            this.props.onError(e.message || JSON.stringify(e));
            return;
        }
        const moduleGroup = this.prepareModuleGroup(marksData);

        this.setState({
            loading: false,
            moduleGroups: [moduleGroup]
        });
        this.props.onDataLoaded?.call(null, marksData);
    }

    async getSpreadsheetInfo(): Promise<{ spreadsheetId: string, sheetName: string } | null> {
        const result = this.tableUrl.match(/d\/(?<id>[a-zA-Z0-9-_]+)\/edit/);
        if (!result?.groups || !result.groups.id) {
            this.setState({
                loading: false,
                tableUrlError: {error: true, message: 'Неверный url-адрес.'}
            });
            return null;
        }
        const spreadsheetId = result.groups.id;

        try { // @ts-ignore
            const res = await gapi.client.sheets.spreadsheets.get({spreadsheetId});
            const sheetName = JSON.parse(res.body).sheets[0].properties.title;
            return {spreadsheetId, sheetName};
        } catch (e) {
            this.props.onError(e.message || JSON.stringify(e));
            return null;
        }
    }

    render() {
        return (
            <span className={'spreadsheet-fetch'}>
                <h3 className={'header'}>Вставь ссылку на Google Таблицу</h3>
                <form onSubmit={this.loadTable} className={'form'}>
                    <TextField name="table-url"
                               label="Ссылка"
                               type="text"
                               className={'tableUrl'}
                               onChange={this.handleChange}
                               error={this.state.tableUrlError.error}
                               helperText={this.state.tableUrlError.message}
                               required/>
                    <SubmitWithLoading title="загрузить"
                                       loading={this.state.loading}
                                       className={'submit'}/>
                </form>
                <Collapse in={!!this.state.moduleGroups.length}>
                    <NestedList items={this.state.moduleGroups} collapsed={false}/>
                </Collapse>
            </span>
        );
    }
}

interface Props {
    onDataLoaded: (data: MarksData) => void;
    onUnauthorized: () => void;
    onError: (errorMessage: string) => void;
}

interface State {
    loading: boolean;
    tableUrlError: { error: boolean, message: string };
    moduleGroups: NestedListItem[];
}
