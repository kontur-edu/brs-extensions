import React from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import LoginPage from "./LoginPage";
import WorkPage from "./WorkPage";

function App() {
    return (
        <BrowserRouter>
            <Switch>
                <Route path="/work" component={WorkPage}/>
                <Route component={LoginPage}/>
            </Switch>
        </BrowserRouter>
    )
}

export default App;
