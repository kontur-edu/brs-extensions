import React from 'react';
import {Button, Container,} from "@material-ui/core";
import GoogleTableFetch from "../GoogleTableFetch";
import BrsApi from "../../../apis/BrsApi";
import SessionExpiredAlert from "../../shared/SessionExpiredAlert";
import CustomAlert from "../../shared/CustomAlert";
import GoogleAuth from "../../../apis/GoogleAuth";
import BrsAuth from "../../../apis/BrsAuth";
import {StatusCode} from "../../../helpers/CustomError";
import LoadingPane from "../LoadingPane";
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
        await this.props.googleAuth.ensureInitializedAsync();
        await this.props.brsAuth.tryRestoreAsync();

        const brsAuthorized = this.props.brsAuth.checkAuth();
        const googleAuthorized = this.props.googleAuth.checkAuthorized();

        if (!brsAuthorized)
            this.handleSessionExpired("БРС");
        else if (!googleAuthorized)
            this.handleSessionExpired("Google");
        else
            this.setState({loading: false});
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

    handleSessionExpired = (sessionName: SessionName) => {
        this.setState({openSessionExpiredAlert: true, sessionName, loading: false});
    }

    handleSessionExpiredOk = () => {
        if (this.state.sessionName === "БРС") {
            this.props.brsAuth.logout();
            this.returnToLoginPage();
            this.setState({redirect: true})
        } else if (this.state.sessionName === "Google") {
            this.returnToLoginPage();
        }
    };

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
                <SessionExpiredAlert open={this.state.openSessionExpiredAlert}
                                     sessionName={this.state.sessionName}
                                     onOk={this.handleSessionExpiredOk}/>
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
                        <GoogleTableFetch brsApi={this.props.brsApi} onError={this.handleError}/>
                    </Container>
                </div>
            </React.Fragment>
        );
    }
}

type SessionName = 'БРС' | 'Google';

interface State {
    showControls: boolean;
    openSessionExpiredAlert: boolean;
    sessionName: SessionName | '';
    errorMessage: string;
    runWork: boolean;
    loading: boolean;
    redirect: boolean;
}

interface Props {
    brsAuth: BrsAuth;
    brsApi: BrsApi;
    googleAuth: GoogleAuth;
}
