import React from 'react';
import request from "request-promise";

const corsProxyUrl = "https://kamikoto-cors-proxy.herokuapp.com/"
const baseUrl = corsProxyUrl + 'https://brs.urfu.ru/mrd';

async function authAsync(login: string, password: string) {
    const response = await request({
        url: baseUrl + `/j_spring_security_check`,
        method: 'POST',
        body: `j_username=${login}&j_password=${password}`,
        resolveWithFullResponse: true,
        simple: false,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
    });
    const responseField = document.getElementById("brs-response-field") 
    if (responseField)
        responseField.innerHTML = response.body;
}

export function BrsCheck() {
    return (
        <div>
            <input type={"button"} value={"Check BRS"} onClick={() => authAsync("", "")}/>
            <div className={"response-field"} id={"brs-response-field"}></div>
        </div>
    )
}