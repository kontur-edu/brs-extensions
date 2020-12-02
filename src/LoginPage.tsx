import React, {FormEvent} from 'react';
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import TextField from "@material-ui/core/TextField";
import makeStyles from "@material-ui/core/styles/makeStyles";
import * as brsApi from  './apis/brsApi'
import {green} from "@material-ui/core/colors";

const useStyles = makeStyles((theme) => ({
    paper: {
        marginTop: theme.spacing(8),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    avatar: {
        margin: theme.spacing(1),
        backgroundColor: theme.palette.secondary.main,
    },
    form: {
        width: '100%', // Fix IE 11 issue.
        marginTop: theme.spacing(1),
    },
    submit: {
        margin: theme.spacing(3, 0, 2),
    },
    buttonProgress: {
        color: green[500],
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -12,
        marginLeft: -12,
    }
}));

let username = ''
let password = ''

const credentials: Credentials = {
    username: '',
    password: ''
}

export default function LoginPage() {
    const classes = useStyles();
    return (
        <div>
            <Container component="main" maxWidth="md">
                <h1>Привет!</h1>
                <h3>Как все работает</h3>
                <p>Как-то все работает</p>
                <h3>Правила хранения данных</h3>
                <p>Данные хранятся в localstorage</p>
                <hr/>
                <p>Для начала работы, необходимо авторизоваться в БРС</p>
                <Container maxWidth="xs">
                    <form className={classes.form} onSubmit={onSubmit}>
                        <TextField
                            variant="outlined"
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="Имя пользователя"
                            name="username"
                            autoFocus
                            onChange={onFieldChanged}
                        />
                        <TextField
                            variant="outlined"
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Пароль"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            onChange={onFieldChanged}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            color="primary"
                            className={classes.submit}
                        >
                            Начать работу
                        </Button>
                    </form>
                </Container>
            </Container>
        </div>
    )
}

function onFieldChanged(e: React.ChangeEvent<HTMLInputElement>) {
    const field = e.target
    const credType: 'username' | 'password' = field.id
    credentials[credType] = field.value
}

async function onSubmit(e: FormEvent) {
    e.preventDefault()
    alert(JSON.stringify(credentials))
    return
    if (!(await login(username, password)))
        return
}

async function login(username: string, password: string){
    const sid = await brsApi.authAsync(username, password)
    if (!sid) {
        alert('Неверные имя пользователя или пароль')
        return false
    }
    return true
}

interface Credentials{
    [props: string]: string
}
