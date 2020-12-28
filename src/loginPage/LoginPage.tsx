import React, {FormEvent} from 'react';
import Container from '@material-ui/core/Container';
import TextField from "@material-ui/core/TextField";
import {Redirect} from 'react-router-dom';
import SubmitWithLoading from "../components/SubmitWithLoading";
import BrsAuth from "../apis/brsAuth";
import BrsUrlProvider from "../apis/brsUrlProvider";
import CustomAlert from "../components/CustomAlert";
import {Grid} from "@material-ui/core";
import GoogleButton from "react-google-button";
import Button from "@material-ui/core/Button";
import googleAuth from "../apis/googleAuth";
import "./login-page.css";

const brsAuth = new BrsAuth(new BrsUrlProvider(true));

export default class LoginPage extends React.Component<{}, State> {
    credentials: Credentials;

    constructor(props: {}) {
        super(props);

        this.state = {
            brsAuthorized: false,
            googleAuthorized: false,
            redirect: false,
            submitLoading: false,
            alertInfo: {open: false, message: '', type: 'error'}
        }

        this.credentials = {
            username: '',
            password: ''
        }

        this.onFieldChanged = this.onFieldChanged.bind(this);
        this.onSubmit = this.onSubmit.bind(this);
        this.loginBrs = this.loginBrs.bind(this);
        this.closeAlert = this.closeAlert.bind(this);
        this.loginGoogle = this.loginGoogle.bind(this);
        this.startWork = this.startWork.bind(this);
    }

    async componentDidMount() {
        await googleAuth.init();
        this.setState({
            brsAuthorized: brsAuth.checkAuth(),
            googleAuthorized: googleAuth.checkAuth()
        });
    }

    onFieldChanged(e: React.ChangeEvent<HTMLInputElement>) {
        const field = e.target
        this.credentials[field.id] = field.value
    }

    async onSubmit(e: FormEvent) {
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

    closeAlert() {
        this.setState({alertInfo: {open: false, message: '', type: 'error'}});
    }

    loginGoogle() {
        googleAuth.signIn();
        this.setState({googleAuthorized: true});
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
                            <form className="form" onSubmit={this.onSubmit}>
                                <TextField
                                    variant="outlined"
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="username"
                                    label="Имя пользователя"
                                    name="username"
                                    autoFocus
                                    onChange={this.onFieldChanged}
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
                                           onChange={this.onFieldChanged}/>
                                <SubmitWithLoading title="войти" loading={this.state.submitLoading}/>
                            </form>
                        </Grid>
                        <Grid item className="align-center">
                            <h3>А также</h3>
                        </Grid>
                        <Grid item className="align-center">
                            <GoogleButton label="Войти в Google аккаунт" onClick={this.loginGoogle}/>
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
                                 onClose={this.closeAlert}/>
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
