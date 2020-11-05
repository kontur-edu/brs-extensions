import React from 'react';
import {BrsCheck} from "./BrsCheck";
import {GoogleLoginButton} from './GoogleLoginButton';

function App() {
    return (
        <div className={"wrapper"}>
            <BrsCheck/>
            <br/>
            <GoogleLoginButton/>
            <p className={"spreadsheet-name"} id={"spreadsheet-name"}>Spreadsheet name</p>
            <div className="response-field" id={"spreadsheet"}/>
        </div>
    )
}

export default App;
