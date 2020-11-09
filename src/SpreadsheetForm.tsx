import React from 'react';
import * as auth from './GoogleAuthService';

let spreadsheetId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
let sheetName = 'Class data';
let range = 'A1:F';

auth.events.onSignInStatusChanged = isSignedIn => {
    const authBtn = document.getElementById('authorize_button');
    const signOutBtn = document.getElementById('signout_button');
    if (!authBtn || !signOutBtn)
        return;
    console.log(`SignIn: ${isSignedIn}`);
    authBtn.style.display = isSignedIn ? "none" : "block";
    signOutBtn.style.display = isSignedIn ? "block" : "none";
}

export function SpreadsheetForm() {
    return (
        <div className={"spreadsheet-form"}>
            <button id="authorize_button" onClick={auth.signIn}>Authorize</button>
            <button id="signout_button" onClick={auth.signOut} style={{display: "none"}}>Sign Out</button>
            <br/>
            <label>Spreadsheet id </label>
            <input type="text" id={"sprId"} defaultValue={spreadsheetId} onBlur={event => spreadsheetId = event.target.value}/>
            <br/>
            <label>Sheet name </label>
            <input type="text" id={"sheetName"} defaultValue={sheetName} onBlur={event => sheetName = event.target.value}/>
            <br/>
            <label>Range </label>
            <input type="text" id={"range"} defaultValue={range} onBlur={event => range = event.target.value}/>
            <br/>
            <button onClick={listMajors}>Load table</button>
            <button onClick={clearTable}>Clear</button>
            <p className={"spreadsheet-name"} id={"spreadsheet-name"}>Spreadsheet name</p>
            <div className="response-field" id={"table"}/>
        </div>
    )
}

function appendPre(message: string, table: HTMLElement | null) {
    const row = document.createElement('div');
    row.innerText = message;
    table && table.appendChild(row);
}

/**
 * Print the names and majors of students in a sample spreadsheet:
 * https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 */
function listMajors() {
    // @ts-ignore
    console.log(`Load ${range} from ${sheetName} from ${spreadsheetId}`);
    const table = document.getElementById('table');
    // @ts-ignore
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `${sheetName}!${range}`,
        
    }).then((response: { result: any; }) => {
        const range = response.result;
        if (range.values.length > 0) {
            for (const row of range.values)
                appendPre(row.join(' | '), table);
        } else {
            appendPre('No data found.', table);
        }
    }, (response: { result: { error: { message: string; }; }; }) => {
        alert(response.result.error.message);
    });
}

function clearTable(){
    const table = document.getElementById('table');
    if (table)
        table.innerHTML = "";
}