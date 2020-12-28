import React from 'react';
import {withStyles} from '@material-ui/core/styles';
import Dialog from '@material-ui/core/Dialog';
import MuiDialogTitle from '@material-ui/core/DialogTitle';
import MuiDialogContent from '@material-ui/core/DialogContent';
import MuiDialogActions from '@material-ui/core/DialogActions';
import SubmitWithLoading from "../components/SubmitWithLoading";
import {List} from "@material-ui/core";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import {MarksData, PutMarksOptions} from "../functions/buildMarksAutoAsync";
import {Logger} from "../helpers/logger";
import BrsApi from "../apis/brsApi";
import putMarksToBrsAsync from "../functions/putMarksToBrsAsync";

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
    options: PutMarksOptions;

    constructor(props: Props) {
        super(props);

        this.options = {
            save: props.workData.save,
            verbose: true,
            cancelPending: false
        };

        this.state = {
            okLoading: true,
            cancelPending: false,
            logItems: [],
        };

        this.cancelWork = this.cancelWork.bind(this);
        this.startWork = this.startWork.bind(this);
        this.logMessage = this.logMessage.bind(this);
        this.handleWorkFinished = this.handleWorkFinished.bind(this);
        this.showError = this.showError.bind(this);
    }

    componentDidMount() {
        this.props.runWork && this.startWork();
    }

    logMessage(message: string) {
        this.state.logItems.push(message);
        this.setState({});
    }

    async startWork() {
        const logger = new Logger();
        logger.addLogHandler(this.logMessage);
        logger.addErrorHandler(this.showError);

        const brsApi = this.props.workData.brsApi;
        const marksData = this.props.workData.marksData;

        if (!marksData)
            return;

        await putMarksToBrsAsync(brsApi, logger, marksData, this.options);
        this.handleWorkFinished();
    }

    showError(errorMessage: string) {
        errorMessage = `${errorMessage}`;
        if (errorMessage.endsWith(" is Forbidden")) {
            this.props.onUnauthorized();
            return;
        }
        this.props.onError(errorMessage);
    }

    handleWorkFinished() {
        this.setState({
            cancelPending: false,
            okLoading: false
        });
    }

    cancelWork() {
        this.options.cancelPending = true;
        this.setState({cancelPending: true});
    }

    render() {
        return (
            <React.Fragment>
                <Dialog open={this.props.runWork} maxWidth="sm" fullWidth>
                    <MuiDialogTitle>Лог действий</MuiDialogTitle>
                    <DialogContent dividers>
                        <List dense style={{height: 300}}>
                            {this.state.logItems.map((item, index) => (
                                <ListItem key={index}>
                                    <ListItemText primary={item}/>
                                </ListItem>
                            ))}
                        </List>
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

interface Props {
    runWork: boolean;
    workData: { save: boolean, brsApi: BrsApi, marksData?: MarksData };
    onClosed: () => void;
    onError: (errorMessage: string) => void;
    onUnauthorized: () => void;
}

interface State {
    okLoading: boolean;
    cancelPending: boolean;
    logItems: string[];
}
