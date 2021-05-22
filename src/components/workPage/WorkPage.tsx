import React from 'react';
import {Button, Container,} from "@material-ui/core";
import SpreadsheetFetch from "../googleTableFetch";
import BrsApi from "../../apis/brsApi";
import SessionExpiredAlert from "../SessionExpiredAlert";
import CustomAlert from "../CustomAlert";
import googleAuth from "../../apis/googleAuth";
import BrsAuth from "../../apis/brsAuth";
import {StatusCode} from "../../helpers/CustomError";
import LoadingPane from "./loadingPane/LoadingPane";
import {Redirect} from "react-router-dom";

export default class WorkPage extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            showControls: false,
            runWork: false,
            openSessionExpiredAlert: false,
            sessionName: '',
            errorMessage: '',
            loading: true,
            redirect: false
        }
    }

    async componentDidMount() {
        await googleAuth.init();
        await this.props.brsAuth.tryRestoreAsync();

        const brsAuthorized = this.props.brsAuth.checkAuth();
        const googleAuthorized = googleAuth.checkAuthorized();

        if (!brsAuthorized)
            this.handleSessionExpired("БРС");
        else if (!googleAuthorized)
            this.handleSessionExpired("Google");
        else
            this.setState({loading: false});
    }

    handleSessionExpired = (sessionName: string) => {
        this.setState({openSessionExpiredAlert: true, sessionName, loading: false});
    }

    handleError = (error: any) => {
        const errorMessage: string = error.message || JSON.stringify(error);
        if (error.statusCode)
            if (error.statusCode === StatusCode.BrsUnauthorized)
                this.handleSessionExpired("БРС");
            else
                this.handleSessionExpired("Google");
        else if (error.name === "RequestError")
            this.setState({errorMessage: "В данный момент сервер недоступен. Попробуйте позже."});
        else
            this.setState({errorMessage});
    }

    closeError = () => {
        this.setState({errorMessage: ''})
    }

    returnToLoginPage = () => {
        this.setState({redirect: true})
    }

    render() {
        return (
            <React.Fragment>
                {this.state.loading && <LoadingPane/>}
                {this.state.openSessionExpiredAlert && <SessionExpiredAlert brsAuth={this.props.brsAuth}
                                                                            sessionName={this.state.sessionName}
                                                                            open={this.state.openSessionExpiredAlert}/>}
                {this.state.errorMessage && <CustomAlert open={!!this.state.errorMessage}
                                                         message={this.state.errorMessage}
                                                         type={'error'}
                                                         onClose={this.closeError}/>}
                {this.state.redirect && <Redirect to="/"/>}
                <div className="work-page">
                    <Container maxWidth="md">
                        <Button variant="contained"
                                style={{marginTop: 10}}
                                onClick={this.returnToLoginPage}>
                            Вернуться на страницу входа
                        </Button>
                        <SpreadsheetFetch brsApi={this.props.brsApi} onError={this.handleError}/>
                    </Container>
                </div>
            </React.Fragment>
        );
    }
}

interface State {
    showControls: boolean;
    openSessionExpiredAlert: boolean;
    sessionName: string;
    errorMessage: string;
    runWork: boolean;
    loading: boolean;
    redirect: boolean;
}

interface Props {
    brsAuth: BrsAuth;
    brsApi: BrsApi;
}
