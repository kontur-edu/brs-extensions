import React from 'react';
import {Container,} from "@material-ui/core";
import DisciplinesFetch from "../DisciplinesFetch";
import SpreadsheetFetch from "../spreadsheetFetch";
import WorkerDialog from "../WorkerDialog";
import MarksManager, {MarksData, PutMarksOptions} from "../../marksActions/MarksManager";
import BrsApi from "../../apis/brsApi";
import SessionExpiredAlert from "../SessionExpiredAlert";
import CustomAlert from "../CustomAlert";
import googleAuth from "../../apis/googleAuth";
import {Logger} from "../../helpers/logger";
import BrsAuth from "../../apis/brsAuth";
import RunWorkerButtons from "../RunWorkerButtons";

export default class WorkPage extends React.Component<Props, State> {
    marksData: MarksData;
    marksManager: MarksManager

    constructor(props: Props) {
        super(props);

        this.marksData = {} as any;
        this.marksManager = {} as any;

        this.state = {
            showControls: false,
            runWork: false,
            openUnauthorizedAlert: false,
            sessionName: '',
            errorMessage: '',
        }

    }

    async componentDidMount() {
        await googleAuth.init();

        const brsAuthorized = this.props.brsAuth.checkAuth();
        const googleAuthorized = googleAuth.checkAuthorized();

        if (!brsAuthorized)
            this.handleUnauthorized("БРС");
        else if (!googleAuthorized)
            this.handleUnauthorized("Google");
    }

    handleDataLoaded = (data: MarksData) => {
        this.marksData = data;
        this.setState({showControls: true});
    }

    runWork = (save: boolean) => {
        const logger = new Logger();
        logger.addErrorHandler(this.handleError);

        const options: PutMarksOptions = {save, verbose: true};

        const brsAuth: BrsAuth = this.props.brsAuth;
        const brsApi = new BrsApi(brsAuth, brsAuth.brsUrlProvider);
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

    handleUnauthorized = (sessionName: string) => {
        this.setState({openUnauthorizedAlert: true, sessionName});
    }

    handleError = (error: any) => {
        const errorMessage: string = error.message || JSON.stringify(error);
        if (errorMessage.endsWith(' is Forbidden'))
            this.handleUnauthorized("БРС");
        else
            this.setState({errorMessage});
    }

    closeError = () => {
        this.setState({errorMessage: ''})
    }

    render() {
        return (
            <React.Fragment>
                {this.state.openUnauthorizedAlert && <SessionExpiredAlert brsAuth={this.props.brsAuth}
                                                                          sessionName={this.state.sessionName}
                                                                          open={this.state.openUnauthorizedAlert}/>}
                {this.state.errorMessage && <CustomAlert open={!!this.state.errorMessage}
                                                         message={this.state.errorMessage}
                                                         type={'error'}
                                                         onClose={this.closeError}/>}
                <div className="work-page">
                    <Container maxWidth="md">
                        <DisciplinesFetch brsApi={this.props.brsApi} onUnauthorized={this.handleUnauthorized}/>
                        <hr/>
                        <SpreadsheetFetch onDataLoaded={this.handleDataLoaded}
                                          onError={this.handleError}/>
                        <br/>
                        <RunWorkerButtons show={this.state.showControls}
                                          onRunWorkUnsafe={this.handleRunWorkUnsafe}
                                          onRunWorkSafe={this.handleRunWorkSafe}/>
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
    sessionName: string;
    errorMessage: string;
    runWork: boolean;
}

interface Props {
    brsAuth: BrsAuth;
    brsApi: BrsApi;
}
