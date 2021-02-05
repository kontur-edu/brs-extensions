import React from 'react';
import {Button, Collapse, Container, Grid,} from "@material-ui/core";
import DisciplinesFetch from "./DisciplinesFetch";
import SpreadsheetFetch from "./spreadsheetFetch";
import WorkerDialog from "./WorkerDialog";
import MarksManager, {MarksData, PutMarksOptions} from "../marksActions/MarksManager";
import BrsAuth from "../apis/brsAuth";
import BrsUrlProvider from "../apis/brsUrlProvider";
import BrsApi from "../apis/brsApi";
import UnauthorizedAlert from "./UnauthorizedAlert";
import CustomAlert from "./CustomAlert";
import googleAuth from "../apis/googleAuth";
import {Logger} from "../helpers/logger";

const brsUrlProvider = new BrsUrlProvider(true);
const brsAuth = new BrsAuth(brsUrlProvider);
const brsApi = new BrsApi(brsAuth, brsUrlProvider);

export default class WorkPage extends React.Component<{}, State> {
    marksData: MarksData;
    marksManager: MarksManager

    constructor(props: {}) {
        super(props);

        this.marksData = {} as any;
        this.marksManager = {} as any;

        this.state = {
            showControls: false,
            runWork: false,
            openUnauthorizedAlert: false,
            errorMessage: '',
        }

    }

    async componentDidMount() {
        await googleAuth.init();

        const authorized = brsAuth.checkAuth() && googleAuth.checkAuthorized();
        if (!authorized)
            this.handleUnauthorized();
    }

    handleDataLoaded = (data: MarksData) => {
        this.marksData = data;
        this.setState({showControls: true});
    }

    runWork = (save: boolean) => {
        const logger = new Logger();
        logger.addErrorHandler(this.handleError);

        const options: PutMarksOptions = {save, verbose: true};

        this.marksManager = new MarksManager(brsApi, logger, options);

        this.setState({runWork: true});
    }

    handleRunWorkSafe = () => {
        this.runWork(false);
    }

    handleRunWorkUnsafe = () => {
        this.runWork(true);
    }

    handleClosed = () => {
        this.setState({runWork: false});
    }

    handleUnauthorized = () => {
        this.setState({openUnauthorizedAlert: true});
    }

    handleError = (error: any) => {
        const errorMessage: string = error.message || JSON.stringify(error);

        if (errorMessage.endsWith(' is Forbidden'))
            this.handleUnauthorized();
        else
            this.setState({errorMessage});
    }

    closeError = () => {
        this.setState({errorMessage: ''})
    }

    render() {
        return (
            <React.Fragment>
                {this.state.openUnauthorizedAlert && <UnauthorizedAlert open={this.state.openUnauthorizedAlert}/>}
                {this.state.errorMessage && <CustomAlert open={!!this.state.errorMessage}
                                                         message={this.state.errorMessage}
                                                         type={'error'}
                                                         onClose={this.closeError}/>}
                <div className="work-page">
                    <Container maxWidth="md">
                        <DisciplinesFetch brsApi={brsApi} onUnauthorized={this.handleUnauthorized}/>
                        <hr/>
                        <SpreadsheetFetch onDataLoaded={this.handleDataLoaded}
                                          onError={this.handleError}
                                          onUnauthorized={this.handleUnauthorized}/>
                        <br/>
                        <Collapse in={this.state.showControls}>
                            <Grid container justify="space-around">
                                <Grid item>
                                    <Button variant="contained"
                                            onClick={this.handleRunWorkSafe}
                                            color="primary">
                                        Попробуй сделать хорошо
                                    </Button>
                                </Grid>
                                <Grid item>
                                    <Button variant="contained"
                                            onClick={this.handleRunWorkUnsafe}
                                            color="secondary">
                                        Сделай хорошо
                                    </Button>
                                </Grid>
                            </Grid>
                        </Collapse>
                        {
                            this.state.runWork &&
                            <WorkerDialog runWork={this.state.runWork}
                                          marksData={this.marksData}
                                          marksManager={this.marksManager}
                                          onClosed={this.handleClosed}/>
                        }
                    </Container>
                </div>
            </React.Fragment>
        );
    }
}

interface State {
    showControls: boolean;
    openUnauthorizedAlert: boolean;
    errorMessage: string;
    runWork: boolean;
}
