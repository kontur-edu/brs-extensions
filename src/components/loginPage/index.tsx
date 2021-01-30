import React, {FormEvent} from 'react';
import {Grid, Button, Container, TextField} from "@material-ui/core";
import {Redirect} from 'react-router-dom';
import SubmitWithLoading from "../submitWithLoading";
import BrsAuth from "../../apis/brsAuth";
import BrsUrlProvider from "../../apis/brsUrlProvider";
import CustomAlert from "../CustomAlert";
import GoogleLoginButton from "../GoogleLoginButton";
import "./styles.css";

const brsAuth = new BrsAuth(new BrsUrlProvider(true));

export default class LoginPage extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props);

        this.state = {
            credentials: {
                username: '',
                password: '',
                sid: ''
            },
            brsAuthorized: brsAuth.checkAuth(),
            googleAuthorized: false,
            redirect: false,
            submitLoading: false,
            openAlert: false,
            alertMessage: '',
            alertType: 'error'
        }

    }

    handleUsernameChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        this.setState({
            credentials: {
                ...this.state.credentials,
                username: value,
                sid: '',
            },
        });
    }

    handlePasswordChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        this.setState({
            credentials: {
                ...this.state.credentials,
                password: value,
                sid: '',
            },
        });
    }

    handleSidChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        this.setState({
            credentials: {
                ...this.state.credentials,
                sid: value,
                username: '',
                password: '',
            },
        });
    }

    handleBrsSubmit = async (e: FormEvent) => {
        e.preventDefault();
        this.setState({submitLoading: true});

        const loginSucceed = await this.loginBrsAsync();

        this.setState({submitLoading: false})

        if (loginSucceed) {
            this.setState({
                alertMessage: 'Авторизация прошла успешно',
                openAlert: true,
                alertType: 'success',
                brsAuthorized: true
            });
        } else
            this.setState({
                alertMessage: 'Неверные имя пользователя или пароль',
                openAlert: true,
                alertType: 'error'
            });
    }

    loginBrsAsync = async () => {
        const {credentials} = this.state;
        if (credentials.sid) {
            return await brsAuth.authBySidAsync(credentials.sid);
        }
        if (credentials.username && credentials.password) {
            return await brsAuth.loginAsync(credentials.username, credentials.password);
        }
        return false;
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

    render() {
        const {credentials} = this.state;
        return (
            <div className="login-page">
                {this.state.redirect && <Redirect to="/brs-extensions/work"/>}
                <Container component="main" maxWidth="md">
                    <h1>Привет!</h1>
                    <h3>Как все работает</h3>
                    <p>Как-то все работает</p>
                    <h3>Правила хранения данных</h3>
                    <p>Данные хранятся в localstorage</p>
                    <hr/>
                    <p>Для начала работы, необходимо авторизоваться в БРС</p>
                    <Grid container justify="space-around">
                        <Grid item md={5} lg={5} sm={5} xs={10}>
                            <form className="form" onSubmit={this.handleBrsSubmit}>
                                <TextField
                                    variant="outlined"
                                    margin="normal"
                                    fullWidth
                                    id="username"
                                    label="Имя пользователя"
                                    name="username"
                                    autoFocus
                                    value={credentials.username}
                                    onChange={this.handleUsernameChanged}
                                />
                                <TextField variant="outlined"
                                           margin="normal"
                                           fullWidth
                                           name="password"
                                           label="Пароль"
                                           type="password"
                                           id="password"
                                           autoComplete="current-password"
                                           value={credentials.password}
                                           onChange={this.handlePasswordChanged}/>
                                <p className="text-center">или</p>
                                <TextField variant="outlined"
                                           margin="normal"
                                           fullWidth
                                           name="sid"
                                           label="JSESSIONID"
                                           type="password"
                                           id="sid"
                                           value={credentials.sid}
                                           onChange={this.handleSidChanged}/>
                                <SubmitWithLoading title="войти" loading={this.state.submitLoading}/>
                            </form>
                        </Grid>
                        <Grid item className="align-center">
                            <h3>А также</h3>
                        </Grid>
                        <Grid item className="align-center">
                            <GoogleLoginButton onSignedIn={this.handleGoogleSignedIn}
                                               onFailure={this.handleGoogleLoginFailed}/>
                            <br/>
                        </Grid>
                    </Grid>
                    <Container className="start-work-wrapper">
                        <Button variant="contained"
                                onClick={this.startWork}
                                disabled={!this.state.brsAuthorized || !this.state.googleAuthorized}
                                color="secondary">начать работу</Button>
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

interface Credentials {
    username: string
    password: string
    sid: string

    [props: string]: string
}

interface State {
    credentials: Credentials;
    brsAuthorized: boolean;
    googleAuthorized: boolean;
    submitLoading: boolean;
    redirect: boolean;
    openAlert: boolean,
    alertMessage: string,
    alertType: "error" | "success";
}
