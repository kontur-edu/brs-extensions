import {createContext} from "react";
import BrsAuth from "./apis/brsAuth";
import BrsApi from "./apis/brsApi";

// @ts-ignore
const Context = createContext<{ brsAuth: BrsAuth, brsApi: BrsApi }>();

export default Context;
