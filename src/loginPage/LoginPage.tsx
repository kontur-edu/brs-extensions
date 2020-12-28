import React, {FormEvent} from 'react';
import Container from '@material-ui/core/Container';
import TextField from "@material-ui/core/TextField";
import {Redirect} from 'react-router-dom';
import SubmitWithLoading from "../components/SubmitWithLoading";
import BrsAuth from "../apis/brsAuth";
import BrsUrlProvider from "../apis/brsUrlProvider";
import CustomAlert from "../components/CustomAlert";
import {Grid} from "@material-ui/core";
import Button from "@material-ui/core/Button";
import "./login-page.css";
import GoogleLoginButton from "./GoogleLoginButton";

const brsAuth = new BrsAuth(new BrsUrlProvider(true));

export default class LoginPage extends React.Component<{}, State> {
    credentials: Credentials;

    constructor(props: {}) {
        super(props);

        this.state = {
            brsAuthorized: brsAuth.checkAuth(),
            googleAuthorized: false,
            redirect: false,
            submitLoading: false,
            alertInfo: {open: false, message: '', type: 'error'}
        }

        this.credentials = {
            username: '',
            password: ''
        }

        this.handleFieldChanged = this.handleFieldChanged.bind(this);
        this.handleBrsSubmit = this.handleBrsSubmit.bind(this);
        this.loginBrs = this.loginBrs.bind(this);
        this.handleCloseAlert = this.handleCloseAlert.bind(this);
        this.handleGoogleSignedIn = this.handleGoogleSignedIn.bind(this);
        this.handleGoogleLoginFailed = this.handleGoogleLoginFailed.bind(this);
        this.startWork = this.startWork.bind(this);
    }

    handleFieldChanged(e: React.ChangeEvent<HTMLInputElement>) {
        const field = e.target
        this.credentials[field.id] = field.value
    }

    async handleBrsSubmit(e: FormEvent) {
        e.preventDefault();
        this.setState({submitLoading: true});

        const loginSucceed = await this.loginBrs();

        this.setState({submitLoading: false})

        if (loginSucceed) {
            this.setState({
                alertInfo: {
                    message: 'Авторизация прошла успешно',
                    open: true,
                    type: 'success'
                },
                brsAuthorized: true
            });
        } else
            this.setState({
                alertInfo: {
                    message: 'Неверные имя пользователя или пароль',
                    open: true,
                    type: 'error'
                }
            });
    }

    async loginBrs() {
        return await brsAuth.authAsync(this.credentials.username, this.credentials.password);
    }

    handleCloseAlert() {
        this.setState({alertInfo: {open: false, message: '', type: 'error'}});
    }

    handleGoogleSignedIn() {
        this.setState({googleAuthorized: true});
    }

    handleGoogleLoginFailed(error: any) {
        console.error(error);

        this.setState({
            alertInfo: {
                open: true,
                type: 'error',
                message: 'Не удалось подключить ваш Google аккаунт :('
            }
        });
    }

    startWork() {
        this.setState({redirect: true});
    }

    render() {
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
                                    required
                                    fullWidth
                                    id="username"
                                    label="Имя пользователя"
                                    name="username"
                                    autoFocus
                                    onChange={this.handleFieldChanged}
                                />
                                <TextField variant="outlined"
                                           margin="normal"
                                           required
                                           fullWidth
                                           name="password"
                                           label="Пароль"
                                           type="password"
                                           id="password"
                                           autoComplete="current-password"
                                           onChange={this.handleFieldChanged}/>
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
                    <CustomAlert open={this.state.alertInfo.open}
                                 message={this.state.alertInfo.message}
                                 type={this.state.alertInfo.type}
                                 onClose={this.handleCloseAlert}/>
                </Container>
            </div>
        );
    }
}

interface Credentials {
    username: string
    password: string

    [props: string]: string
}

interface AlertInfo {
    open: boolean,
    message: string,
    type: "error" | "success";
}

interface State {
    brsAuthorized: boolean;
    googleAuthorized: boolean;
    submitLoading: boolean;
    redirect: boolean;
    alertInfo: AlertInfo;
}
