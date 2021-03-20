import React from "react";
import "./styles.css";
import {CircularProgress} from "@material-ui/core";

export default function () {
    return (
        <div className={"loading-pane"}>
            <CircularProgress size={100} className={"progress"}/>
        </div>
    );
}
