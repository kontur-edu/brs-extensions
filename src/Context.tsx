import {createContext} from "react";
import BrsAuth from "./apis/BrsAuth";
import BrsApi from "./apis/BrsApi";

// @ts-ignore
const Context = createContext<{ brsAuth: BrsAuth, brsApi: BrsApi, googleAuth: GoogleAuth }>();

export default Context;
