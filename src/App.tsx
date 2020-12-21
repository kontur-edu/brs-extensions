import React from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import LoginPage from "./LoginPage";
import WorkPage from "./workPage/WorkPage";

function App() {
    return (
        <BrowserRouter>
            <Switch>
                <Route path="/brs-extensions/work" component={WorkPage}/>
                <Route exact path="/brs-extensions" component={LoginPage}/>
            </Switch>
        </BrowserRouter>
    )
}

export default App;
