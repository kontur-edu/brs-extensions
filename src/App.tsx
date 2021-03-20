import React from 'react';
import {HashRouter, Route, Switch} from 'react-router-dom';
import BrsUrlProvider from "./apis/brsUrlProvider";
import BrsAuth from "./apis/brsAuth";
import LoginPageWrapper from "./components/loginPage/LoginPageWrapper";
import WorkPageWrapper from "./components/workPage/WorkPageWrapper";
import BrsApi from "./apis/brsApi";
import Context from './Context';

const urlProvider = new BrsUrlProvider(true);
const brsAuth = new BrsAuth(urlProvider);
const brsApi = new BrsApi(brsAuth, urlProvider);

export default function App() {
    return (
        <Context.Provider value={{brsAuth, brsApi}}>
            <HashRouter hashType={"noslash"}>
                <Switch>
                    <Route path="/work" component={WorkPageWrapper}/>
                    <Route exact path="" component={LoginPageWrapper}/>
                </Switch>
            </HashRouter>
        </Context.Provider>
    )
}
