import React from "react";
import { HashRouter, Route, Switch } from "react-router-dom";
import BrsUrlProvider from "./apis/BrsUrlProvider";
import BrsAuth from "./apis/BrsAuth";
import GoogleAuth from "./apis/GoogleAuth";
import LoginPageContainer from "./components/login/LoginPageContainer";
import WorkPageContainer from "./components/work/WorkPageContainer";
import BrsApi from "./apis/BrsApi";
import Context from "./Context";

const urlProvider = new BrsUrlProvider(true);
const brsAuth = new BrsAuth(urlProvider);
const brsApi = new BrsApi(brsAuth, urlProvider);
const googleAuth = new GoogleAuth();

export default function App() {
  return (
    <Context.Provider value={{ brsAuth, brsApi, googleAuth }}>
      <HashRouter hashType={"noslash"}>
        <Switch>
          <Route path="/work" component={WorkPageContainer} />
          <Route exact path="" component={LoginPageContainer} />
        </Switch>
      </HashRouter>
    </Context.Provider>
  );
}
