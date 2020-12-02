import React, {ChangeEvent, FormEvent} from 'react';
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import TextField from "@material-ui/core/TextField";
import makeStyles from "@material-ui/core/styles/makeStyles";

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
}));

const credentials = {
    'username': '',
    'password': ''
}

export default function LoginPage() {
    const classes = useStyles();
    return (
        <div>
            <Container component="main" maxWidth="xs">
                <h1>Привет!</h1>
                <h3>Как все работает</h3>
                <p>Как-то все работает</p>
                <h3>Правила хранения данных</h3>
                <p>Данные хранятся в localstorage</p>
                <hr/>
                <p>Для начала работы, необходимо авторизоваться в БРС</p>
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
        </div>
    )
}

function onFieldChanged(e: ChangeEvent) {
    const field = e.target
    if (field.nodeValue)
        credentials[field.id] = field.nodeValue
}

function onSubmit(e:FormEvent) {
    e.preventDefault()
}
