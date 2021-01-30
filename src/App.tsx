import React from 'react';
import {BrowserRouter, Route, Switch} from 'react-router-dom';
import LoginPage from "./components/loginPage";
import WorkPage from "./components/WorkPage";

export default function App() {
    return (
        <BrowserRouter>
            <Switch>
                <Route path="/brs-extensions/work" component={WorkPage}/>
                <Route exact path="/brs-extensions" component={LoginPage}/>
            </Switch>
        </BrowserRouter>
    )
}
