import React from 'react';
import "./styles.css";
import {Redirect} from "react-router-dom";
import {Button, Container} from "@material-ui/core";
import BrsAuth, {LoginStatus} from "../../apis/brsAuth";
import BrsLoginForm, {Credentials} from "./brsLoginForm";
import GoogleAuth from "../../apis/googleAuth";
import GoogleLoginButton from "./GoogleLoginButton";
import CustomAlert from "../CustomAlert";

export default class LoginPage extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            brsLoading: true,
            brsAuthorized: false,
            googleAuthorized: false,
            redirect: false,
            submitLoading: false,
            openAlert: false,
            alertMessage: '',
            alertType: 'error'
        }

    }

    async componentDidMount() {
        await this.props.brsAuth.tryRestoreAsync();
        await this.props.googleAuth.ensureInitializedAsync();

        const brsAuthorized = this.props.brsAuth.checkAuth();
        const googleAuthorized = this.props.googleAuth.checkAuthorized();
        this.setState({brsLoading: false, brsAuthorized, googleAuthorized});
    }

    handleBrsSubmit = async (credentials: Credentials) => {
        this.setState({submitLoading: true});

        const loginStatus = await this.loginBrsAsync(credentials);

        this.setState({submitLoading: false})

        switch (loginStatus) {
            case LoginStatus.Succeed:
                this.setState({
                    alertMessage: "Авторизация прошла успешно",
                    openAlert: true,
                    alertType: 'success',
                    brsAuthorized: true
                });
                break;
            case LoginStatus.Error:
                this.setState({
                    alertMessage: "Что-то пошло не так :( Попробуйте позже",
                    openAlert: true,
                    alertType: 'error'
                });
                break;
            case LoginStatus.InvalidCredentials:
                this.setState({
                    alertMessage: "Неверные логин, пароль или JSESSIONID",
                    openAlert: true,
                    alertType: 'error'
                });
        }
    }

    loginBrsAsync = async (credentials: Credentials): Promise<LoginStatus> => {
        if (credentials.sid) {
            return await this.props.brsAuth.authBySidAsync(credentials.sid);
        }
        if (credentials.login && credentials.password) {
            return await this.props.brsAuth.loginAsync(credentials.login, credentials.password);
        }
        return LoginStatus.InvalidCredentials;
    }

    handleCloseAlert = () => {
        this.setState({openAlert: false});
    }

    handleGoogleSignedIn = () => {
        this.setState({googleAuthorized: true});
    }

    handleGoogleLoginFailed = (error: any) => {
        console.error(error);

        this.setState({
            openAlert: true,
            alertType: 'error',
            alertMessage: 'Не удалось подключить Ваш Google аккаунт :('
        });
    }

    startWork = () => {
        this.setState({redirect: true});
    }

    handleBrsLogout = () => {
        this.props.brsAuth.logout();
        this.setState({
            brsAuthorized: false,
            alertMessage: "Вы вышли из аккаунта БРС",
            alertType: "success",
            openAlert: true
        });
    }

    handleGoogleLogout = async () => {
        await this.props.googleAuth.logout();
        this.setState({
            googleAuthorized: false,
            alertType: "success",
            alertMessage: "Вы вышли из аккаунта Google",
            openAlert: true
        });
    }

    renderGreeting = () => {
        return (
            <div style={{width: 700}}>
                <h1>Добро пожаловать в Расширения БРС</h1>
                <h3 className={"block-header"}>Как все работает</h3>
                <p>В Google&nbsp;Таблицах вы заполняете оценки за курс по некоторому шаблону.<br/>
                    После этого импортируете Google Таблицу в сервис и выполняете пробный запуск выставления
                    оценок,
                    чтобы исключить ошибки.<br/>
                    Наконец делаете запуск с реальным выставлением оценок.</p>
                <h3 className={"block-header"}>Правила хранения данных</h3>
                <p>Ваш логин и пароль передаются в БРС и нигде не сохраняются.<br/>
                    Данные о доступных вам курсах сохраняются только в вашем браузере.</p>
            </div>
        );
    }

    renderBrsLogin = () => {
        return (
            <BrsLoginForm onSubmit={this.handleBrsSubmit}
                          loading={this.state.brsLoading}
                          signedIn={this.state.brsAuthorized}
                          onLogout={this.handleBrsLogout}
                          userName={this.props.brsAuth.userName}
                          submitting={this.state.submitLoading}/>
        );
    }

    renderGoogleLogin = () => {
        return (
            <GoogleLoginButton onSignedIn={this.handleGoogleSignedIn}
                               signedIn={this.state.googleAuthorized}
                               userName={this.props.googleAuth.getUserName()}
                               onLogout={this.handleGoogleLogout}
                               onFailure={this.handleGoogleLoginFailed}/>
        );
    }

    renderStartWorkButton = () => {
        return (
            <Button variant="contained"
                    onClick={this.startWork}
                    disabled={!this.state.brsAuthorized || !this.state.googleAuthorized}
                    color="secondary">
                начать работу
            </Button>
        );
    }

    render() {
        return (
            <div className="login-page">
                {this.state.redirect && <Redirect to="/work"/>}
                <Container component="main" maxWidth="md">
                    {this.renderGreeting()}
                    <hr/>
                    <Container maxWidth={"xs"}>
                        <Container>
                            {this.renderBrsLogin()}
                        </Container>
                        <hr className={"vertical-margin-medium"}/>
                        <Container>
                            {this.renderGoogleLogin()}
                        </Container>
                    </Container>
                    <Container className="text-align-center vertical-margin-large">
                        {this.renderStartWorkButton()}
                    </Container>
                    <CustomAlert open={this.state.openAlert}
                                 message={this.state.alertMessage}
                                 type={this.state.alertType}
                                 onClose={this.handleCloseAlert}/>
                </Container>
            </div>
        );
    }
}

interface State {
    brsLoading: boolean;
    brsAuthorized: boolean;
    googleAuthorized: boolean;
    submitLoading: boolean;
    redirect: boolean;
    openAlert: boolean,
    alertMessage: string,
    alertType: "error" | "success";
}

interface Props {
    brsAuth: BrsAuth;
    googleAuth: GoogleAuth;
}
