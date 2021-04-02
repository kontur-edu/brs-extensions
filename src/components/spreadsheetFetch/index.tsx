import React, {FormEvent, memo} from "react";
import buildAutoMarksConfigAsync from "../../functions/buildAutoMarksConfigAsync";
import NestedList, {NestedListItem} from "../NestedList";
import {Collapse, TextField} from "@material-ui/core";
import SubmitWithLoading from "../submitWithLoading";
import {MarksData} from "../../marksActions/MarksManager";
import './styles.css';
import {getSpreadsheetProperties} from "../../apis/googleApi";

class SpreadsheetFetch extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            tableUrl: '',
            loading: false,
            tableUrlError: {error: false, message: ''},
            moduleGroups: []
        };

    }

    handleChange = (event: React.ChangeEvent<{ name?: string | undefined, value: unknown }>) => {
        const target = event.target;
        switch (target.name) {
            case 'table-url':
                if (this.state.tableUrlError.error)
                    this.setState({tableUrlError: {error: false, message: ''}});
                this.setState({tableUrl: target.value as string});
        }
    }

    prepareModuleGroup(marksData: MarksData): NestedListItem {
        const groups = marksData.actualStudents.map(s => s.groupName);
        return {
            title: marksData.disciplineConfig.name,
            nestedItems: Array.from(new Set(groups))
        }
    }

    loadTable = async (e: FormEvent) => {
        e.preventDefault();
        this.setState({loading: true});

        const spreadsheetInfo = await this.getSpreadsheetInfo();
        if (!spreadsheetInfo) {
            this.setState({loading: false});
            return;
        }

        let marksData: MarksData;
        try {
            marksData = await buildAutoMarksConfigAsync(spreadsheetInfo.spreadsheetId, spreadsheetInfo.sheetName);
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

    render() {
        return (
            <span className={'spreadsheet-fetch'}>
                <h3 className={'vertical-margin-medium'}>Вставь ссылку на Google Таблицу</h3>
                <form onSubmit={this.loadTable} className={'vertical-margin-medium'}>
                    <TextField name="table-url"
                               label="Ссылка"
                               type="text"
                               className={'tableUrl'}
                               value={this.state.tableUrl}
                               onChange={this.handleChange}
                               error={this.state.tableUrlError.error}
                               helperText={this.state.tableUrlError.message}
                               required/>
                    <SubmitWithLoading title="загрузить"
                                       loading={this.state.loading}
                                       className={'submit'}/>
                </form>
                <Collapse in={!!this.state.moduleGroups.length} className={"vertical-margin-medium"}>
                    <NestedList items={this.state.moduleGroups} collapsed={false}/>
                </Collapse>
            </span>
        );
    }
}

export default memo(SpreadsheetFetch);

interface Props {
    onDataLoaded: (data: MarksData) => void;
    onError: (errorMessage: string) => void;
}

interface State {
    tableUrl: string;
    loading: boolean;
    tableUrlError: { error: boolean, message: string };
    moduleGroups: NestedListItem[];
}
