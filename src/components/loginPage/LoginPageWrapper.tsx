import React from "react";
import Context from "../../Context";
import LoginPage from "./index";
import BrsAuth from "../../apis/brsAuth";

export default function () {
    return (
        <Context.Consumer>
            {
                context => <LoginPage brsAuth={(context as { brsAuth: BrsAuth }).brsAuth}/>
            }
        </Context.Consumer>
    );
}
