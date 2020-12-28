import GoogleLogin from "react-google-login";
import React from "react";

const CLIENT_ID = '122993083593-pacve8csj86voko30ia65raeg0ncrtuv.apps.googleusercontent.com';

export default function GoogleLoginButton(props: Props) {
    const {onSignedIn, onFailure} = props;

    return (
        <GoogleLogin
            clientId={CLIENT_ID}
            buttonText="Войти в аккаунт Google"
            onSuccess={onSignedIn}
            onFailure={onFailure}
            isSignedIn={true}
        />
    );
}

interface Props {
    onSignedIn: () => void;
    onFailure: (error: any) => void;
}
