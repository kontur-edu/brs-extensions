import React from 'react';
import {createStyles, Theme, withStyles} from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
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
import {Redirect} from "react-router-dom";

const styles = (theme: Theme) =>
    createStyles({
        root: {
            margin: 0,
            padding: theme.spacing(2),
        },
        closeButton: {
            position: 'absolute',
            right: theme.spacing(1),
            top: theme.spacing(1),
            color: theme.palette.grey[500],
        },
    });

const DialogContent = withStyles((theme: Theme) => ({
    root: {
        padding: 0,
    },
}))(MuiDialogContent);

const DialogActions = withStyles((theme: Theme) => ({
    root: {
        display: 'flex',
        justifyContent: 'space-between'
    },
}))(MuiDialogActions);

export default class RunWorkDialog extends React.Component<Props, State> {
    options: PutMarksOptions;

    constructor(props: Props) {
        super(props);

        this.options = {
            save: props.workData.save,
            verbose: true,
            cancelPending: false
        };

        this.state = {
            okDisabled: true,
            cancelPending: false,
            logItems: [],
            redirectToLoginPage: false,
            alertMessage: ''
        };

        this.cancelWork = this.cancelWork.bind(this);
        this.startWork = this.startWork.bind(this);
        this.logMessage = this.logMessage.bind(this);
        this.workFinished = this.workFinished.bind(this);
        this.showError = this.showError.bind(this);
        this.closeAlert = this.closeAlert.bind(this);
    }

    componentDidMount() {
        this.props.runWork && this.startWork();
    }

    logMessage(message: string) {
        this.state.logItems.push(message);
        this.setState({});
    }

    startWork() {
        const logger = new Logger();
        logger.addLogProvider(this.logMessage);
        logger.addErrorProvider(this.showError);

        const brsApi = this.props.workData.brsApi;
        const marksData = this.props.workData.marksData;

        if (!marksData)
            return;
        new Promise(async res => {
            await putMarksToBrsAsync(brsApi, logger, marksData, this.options);
            this.workFinished();
            res();
        });
    }

    showError(errorMessage: string) {
        errorMessage = `${errorMessage}`;
        if (errorMessage.endsWith(" is Forbidden")) {
            this.props.onUnauthorized();
            return;
        }
        this.props.onError(errorMessage);
    }

    workFinished() {
        this.setState({
            cancelPending: false,
            okDisabled: false
        });
    }

    cancelWork() {
        this.options.cancelPending = true;
        this.setState({cancelPending: true});
    }

    closeAlert() {
        this.setState({alertMessage: ''});
    }

    render() {
        return (
            <React.Fragment>
                <Dialog open={this.props.runWork} maxWidth="sm" fullWidth>
                    <MuiDialogTitle>Лог действий</MuiDialogTitle>
                    <DialogContent dividers>
                        <List dense>
                            {this.state.logItems.map((item, index) => (
                                <ListItem key={index}>
                                    <ListItemText primary={item}/>
                                </ListItem>
                            ))}
                        </List>
                    </DialogContent>
                    <DialogActions>
                        <SubmitWithLoading loading={this.state.okDisabled}
                                           onClick={this.props.onClosed}
                                           title="ок"/>
                        <SubmitWithLoading loading={this.state.cancelPending}
                                           disabled={!this.state.okDisabled}
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
    okDisabled: boolean;
    cancelPending: boolean;
    logItems: string[];
    redirectToLoginPage: boolean;
    alertMessage: string;
}
