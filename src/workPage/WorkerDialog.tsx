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
import MarksManager, {MarksData} from "../functions/MarksManager";

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
    marksManager: MarksManager;

    constructor(props: Props) {
        super(props);

        this.marksManager = props.marksManager;

        this.state = {
            okLoading: true,
            cancelPending: false,
            logItems: [],
        };

        this.cancelWork = this.cancelWork.bind(this);
        this.startWork = this.startWork.bind(this);
        this.logMessage = this.logMessage.bind(this);
    }

    componentDidMount() {
        this.startWork();
    }

    logMessage(message: string) {
        this.state.logItems.push(message);
        this.setState({});
    }

    async startWork() {
        this.marksManager.getLogger().addLogHandler(this.logMessage);

        await this.marksManager.putMarksToBrsAsync(this.props.marksData);

        this.setState({
            cancelPending: false,
            okLoading: false
        });
    }

    cancelWork() {
        this.marksManager?.cancel();
        this.setState({cancelPending: true});
    }

    render() {
        return (
            <React.Fragment>
                <Dialog open={this.props.runWork} maxWidth="lg" fullWidth>
                    <MuiDialogTitle>Лог действий</MuiDialogTitle>
                    <DialogContent dividers>
                        <List dense disablePadding style={{minHeight: 400}}>
                            {this.state.logItems.map((item, index) => (
                                <ListItem key={index} style={{paddingTop: 0, paddingBottom: 0}}>
                                    <ListItemText primary={item} style={{marginTop: 2, marginBottom: 2}}/>
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
    marksManager: MarksManager;
    marksData: MarksData;
    onClosed: () => void;
}

interface State {
    okLoading: boolean;
    cancelPending: boolean;
    logItems: string[];
}
