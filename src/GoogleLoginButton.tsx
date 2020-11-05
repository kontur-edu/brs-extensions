import GoogleLogin from 'react-google-login';
import React from 'react'
import * as gapi from 'gapi';

async function handleResponse(response: any) {
    const spreadsheetId = '1Owzl3JfmFASIdC7ZMMw-0kkA3pwFSab1QdVO5dhZoxY';
    const accessToken = response.accessToken;
    const title = document.getElementById("spreadsheet-name");
    const spreadsheet = document.getElementById("spreadsheet")
    if (!(spreadsheet && title)) {
        alert("No spreadsheet or title field")
        return;
    }
    // gapi.auth.setToken({error: "", expires_in: "", state: "", access_token: accessToken});
}

export function GoogleLoginButton() {
    return (
        <GoogleLogin
            clientId="122993083593-pacve8csj86voko30ia65raeg0ncrtuv.apps.googleusercontent.com"
            buttonText="Login"
            onSuccess={handleResponse}
            onFailure={handleResponse}
            cookiePolicy={"single_host_origin"}
            scope={"https://www.googleapis.com/auth/spreadsheets"}
        />
    )
}