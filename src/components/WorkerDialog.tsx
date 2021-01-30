import React from 'react';
import {withStyles} from '@material-ui/core/styles';
import {Dialog, List, ListItem, ListItemText} from "@material-ui/core";
import MuiDialogTitle from '@material-ui/core/DialogTitle';
import MuiDialogContent from '@material-ui/core/DialogContent';
import MuiDialogActions from '@material-ui/core/DialogActions';
import SubmitWithLoading from "./submitWithLoading";
import MarksManager, {MarksData} from "../managers/MarksManager";

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

    }

    componentDidMount() {
        this.startWork();
    }

    componentWillUnmount() {
        this.cancelWork();
    }

    logMessage = (message: string) => {
        this.setState({logItems: [...this.state.logItems, message]});
    }

    startWork = async () => {
        this.marksManager.getLogger().addLogHandler(this.logMessage);

        await this.marksManager.putMarksToBrsAsync(this.props.marksData);

        this.marksManager.getLogger().removeLogHandler(this.logMessage);

        this.setState({
            cancelPending: false,
            okLoading: false
        });
    }

    cancelWork = () => {
        this.setState({cancelPending: true});
        this.marksManager.cancel();
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
