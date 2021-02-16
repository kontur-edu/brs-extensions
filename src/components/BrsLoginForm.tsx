import {TextField} from "@material-ui/core";
import SubmitWithLoading from "./submitWithLoading";
import React, {FormEvent} from "react";

export default function ({onSubmit, loading}: Props) {
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [sid, setSid] = React.useState('');

    function handleUsernameChanged(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setUsername(value);
    }

    function handlePasswordChanged(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setPassword(value);
    }

    function handleSidChanged(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setSid(value);
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        onSubmit({username, password, sid});
    }

    return (
        <form className="form" onSubmit={handleSubmit}>
            <TextField
                variant="outlined"
                margin="normal"
                fullWidth
                id="username"
                label="Имя пользователя"
                name="username"
                autoFocus
                value={username}
                onChange={handleUsernameChanged}
            />
            <TextField variant="outlined"
                       margin="normal"
                       fullWidth
                       name="password"
                       label="Пароль"
                       type="password"
                       id="password"
                       autoComplete="current-password"
                       value={password}
                       onChange={handlePasswordChanged}/>
            <p className="text-center">или</p>
            <TextField variant="outlined"
                       margin="normal"
                       fullWidth
                       name="sid"
                       label="JSESSIONID"
                       type="password"
                       id="sid"
                       value={sid}
                       onChange={handleSidChanged}/>
            <SubmitWithLoading title="войти" loading={loading}/>
        </form>
    );
}

interface Props {
    loading: boolean;
    onSubmit: (credentials: Credentials) => void;
}

export interface Credentials {
    username: string
    password: string
    sid: string
}
