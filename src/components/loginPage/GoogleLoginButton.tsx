import GoogleLogin from "react-google-login";
import React from "react";
import {Button, Container} from "@material-ui/core";

const CLIENT_ID = '122993083593-pacve8csj86voko30ia65raeg0ncrtuv.apps.googleusercontent.com';
const SCOPES = "profile email https://www.googleapis.com/auth/spreadsheets";

export default function GoogleLoginButton(props: Props) {
    const {onSignedIn, onFailure, signedIn, userName, onLogout} = props;

    return (
        <React.Fragment>
            {
                signedIn ?
                    <Container className={"text-align-center"}>
                        <p>Добро пожаловать, {userName}</p>
                        <Button type="button"
                                fullWidth
                                variant="contained"
                                onClick={onLogout}
                                color="primary">
                            Выйти из Google
                        </Button>
                    </Container> :
                    <Container className={"text-align-center"}>
                        <p><b>Войдите в Google</b>, чтобы сервис мог загружать оценки студентов из ваших
                            Google&nbsp;Таблиц</p>
                        <GoogleLogin
                            clientId={CLIENT_ID}
                            buttonText="Войти в аккаунт Google"
                            onSuccess={onSignedIn}
                            onFailure={onFailure}
                            scope={SCOPES}
                            isSignedIn={true}/>
                    </Container>
            }
        </React.Fragment>
    );
}

interface Props {
    onSignedIn: () => void;
    onFailure: (error: any) => void;
    onLogout: () => void;
    signedIn: boolean;
    userName?: string;
}
