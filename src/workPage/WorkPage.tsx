import React from 'react';
import {Container} from "@material-ui/core";
import {Redirect} from 'react-router-dom';
import DisciplinesFetch from "./DisciplinesFetch";
import SpreadsheetFetch from "./SpreadsheetFetch";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import Collapse from "@material-ui/core/Collapse";
import WorkerDialog from "./WorkerDialog";
import {MarksData} from "../functions/buildMarksAutoAsync";
import BrsAuth from "../apis/brsAuth";
import BrsUrlProvider from "../apis/brsUrlProvider";
import BrsApi from "../apis/brsApi";
import UnauthorizedAlert from "./UnauthorizedAlert";
import * as cache from "../helpers/cache";
import CustomAlert from "../components/CustomAlert";
import googleAuth from "../apis/googleAuth";

const brsUrlProvider = new BrsUrlProvider(true);
const brsAuth = new BrsAuth(brsUrlProvider);
const brsApi = new BrsApi(brsAuth, brsUrlProvider);

export default class WorkPage extends React.Component<{}, State> {
    marksData?: MarksData;

    constructor(props: {}) {
        super(props);

        this.state = {
            authorized: true,
            showControls: false,
            runWork: false,
            openUnauthorizedAlert: false,
            errorMessage: '',
            workData: {save: false, brsApi}
        }

        this.handleDataLoaded = this.handleDataLoaded.bind(this);
        this.runWorkSafe = this.runWorkSafe.bind(this);
        this.handleClosed = this.handleClosed.bind(this);
        this.handleUnauthorized = this.handleUnauthorized.bind(this);
        this.handleError = this.handleError.bind(this);
        this.closeError = this.closeError.bind(this);
    }

    async componentDidMount() {
        await googleAuth.init();
        const authorized = brsAuth.checkAuth() && googleAuth.checkAuth();
        this.setState({authorized});
    }

    handleDataLoaded(data: MarksData) {
        this.marksData = data;
        this.setState({showControls: true});
    }

    runWorkSafe() {
        this.setState({
            runWork: true,
            workData: {save: false, marksData: this.marksData, brsApi}
        });
    }

    handleClosed() {
        this.setState({runWork: false});
    }

    handleUnauthorized() {
        cache.clear('loginInfo');
        this.setState({openUnauthorizedAlert: true});
    }

    handleError(errorMessage: string) {
        this.setState({errorMessage});
    }

    closeError() {
        this.setState({errorMessage: ''})
    }

    render() {
        return (
            <React.Fragment>
                {!this.state.authorized && <Redirect to="/brs-extensions"/>}
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
                                            onClick={this.runWorkSafe}
                                            color="primary">
                                        Попробуй сделать хорошо
                                    </Button>
                                </Grid>
                                <Grid item>
                                    <Button variant="contained"
                                            color="secondary">
                                        Сделай хорошо
                                    </Button>
                                </Grid>
                            </Grid>
                        </Collapse>
                        {
                            this.state.runWork &&
                            <WorkerDialog runWork={this.state.runWork}
                                          workData={this.state.workData}
                                          onUnauthorized={this.handleUnauthorized}
                                          onError={this.handleError}
                                          onClosed={this.handleClosed}/>
                        }
                    </Container>
                </div>
            </React.Fragment>
        );
    }
}

interface State {
    authorized: boolean
    showControls: boolean;
    openUnauthorizedAlert: boolean;
    errorMessage: string;
    runWork: boolean;
    workData: { save: boolean, brsApi: BrsApi, marksData?: MarksData };
}
