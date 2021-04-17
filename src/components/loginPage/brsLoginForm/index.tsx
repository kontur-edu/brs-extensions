import {Button, CircularProgress, TextField} from "@material-ui/core";
import SubmitWithLoading from "../../submitWithLoading";
import React, {FormEvent} from "react";
import "./styles.css"

export default function ({onSubmit, submitting, loading, signedIn, onLogout, username}: Props) {
    const [login, setLogin] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [sid, setSid] = React.useState('');

    function handleUsernameChanged(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setLogin(value);
        setSid("");
    }

    function handlePasswordChanged(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setPassword(value);
        setSid("");
    }

    function handleSidChanged(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setSid(value);
        setLogin("");
        setPassword("");
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (loading)
            return;

        onSubmit({login: login, password, sid});
    }

    return signedIn ? (
            <React.Fragment>
                <p>Добро пожаловать, {username}</p>
                <Button type="button"
                        fullWidth
                        variant="contained"
                        onClick={onLogout}
                        color="primary">
                    Выйти из БРС
                </Button>
            </React.Fragment>
        ) :
        (
            <div className={"brs-login-form"}>
                <form className="form" onSubmit={handleSubmit}>
                    <TextField
                        className={"form-component"}
                        variant="outlined"
                        margin="normal"
                        fullWidth
                        id="username"
                        label="Имя пользователя"
                        name="username"
                        autoFocus
                        value={login}
                        disabled={loading}
                        onChange={handleUsernameChanged}/>
                    <TextField
                        className={"form-component"}
                        variant="outlined"
                        margin="normal"
                        fullWidth
                        name="password"
                        label="Пароль"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        disabled={loading}
                        onChange={handlePasswordChanged}/>
                    <p className="text-center form-component">или</p>
                    <TextField
                        className={"form-component"}
                        variant="outlined"
                        margin="normal"
                        fullWidth
                        name="sid"
                        label="JSESSIONID"
                        type="password"
                        id="sid"
                        value={sid}
                        disabled={loading}
                        onChange={handleSidChanged}/>
                    <SubmitWithLoading className={"vertical-margin-medium"} title="войти" loading={submitting}
                                       disabled={loading}/>
                </form>
                {
                    loading &&
                    <CircularProgress color="primary" size={150} className="progress"/>
                }
            </div>
        );
}

interface Props {
    submitting: boolean;
    loading: boolean;
    onSubmit: (credentials: Credentials) => void;
    onLogout: () => void;
    signedIn: boolean;
    username?: string;
}

export interface Credentials {
    login: string
    password: string
    sid: string
}
