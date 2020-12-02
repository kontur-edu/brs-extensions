import React, {FormEvent} from 'react';
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import TextField from "@material-ui/core/TextField";
import makeStyles from "@material-ui/core/styles/makeStyles";
import * as brsApi from './apis/brsApi'
import {CircularProgress} from "@material-ui/core";
import blue from "@material-ui/core/colors/blue";
import Snackbar from "@material-ui/core/Snackbar";
import Alert from "./Alert";
import {Redirect} from 'react-router-dom';

const useStyles = makeStyles((theme) => ({
    form: {
        width: '100%', // Fix IE 11 issue.
        marginTop: theme.spacing(1),
    },
    submit: {
        margin: theme.spacing(3, 0, 2),
    },
    wrapper: {
        margin: theme.spacing(1),
        position: 'relative',
    },
    buttonProgress: {
        color: blue["A700"],
        position: 'absolute',
        top: '55%',
        left: '50%',
        marginTop: -12,
        marginLeft: -12,
    }
}));

export default function LoginPage() {
    const classes = useStyles();
    const [loading, setLoading] = React.useState(false);
    const [open, setOpen] = React.useState(false);
    const sid = localStorage.getItem('sid')
    const [redirect, setRedirect] = React.useState(!!sid);

    const credentials: Credentials = {
        username: '',
        password: ''
    }

    function onFieldChanged(e: React.ChangeEvent<HTMLInputElement>) {
        const field = e.target
        credentials[field.id] = field.value
    }

    async function onSubmit(e: FormEvent) {
        e.preventDefault()
        setLoading(true)
        const loginSucceed = await login()
        setLoading(false)
        if (loginSucceed)
            setRedirect(true)
        setOpen(true)
    }

    async function login() {
        const sid = await brsApi.authAsync(credentials.username, credentials.password)
        if (!sid) {
            return false
        }
        localStorage.setItem('sid', sid)
        return true
    }

    function closeAlert() {
        setOpen(false)
    }

    return (
        <div>
            {redirect && <Redirect to="/work"/>}
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
                        <div className={classes.wrapper}>
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                color="primary"
                                className={classes.submit}
                                disabled={loading}
                            >
                                Начать работу
                            </Button>
                            {
                                loading &&
                                <CircularProgress color="secondary" size={24} className={classes.buttonProgress}/>
                            }
                        </div>
                    </form>
                </Container>
                <Snackbar
                    open={open}
                    autoHideDuration={5000}
                    anchorOrigin={{vertical: 'top', horizontal: 'center'}}
                    onClose={closeAlert}>
                    <Alert severity="error" onClose={closeAlert}>
                        Неверные имя пользователя или пароль
                    </Alert>
                </Snackbar>
            </Container>
        </div>
    )
}

interface Credentials {
    username: string
    password: string

    [props: string]: string
}
