import { createContext } from "react";
import BrsAuth from "./apis/BrsAuth";
import BrsApi from "./apis/BrsApi";

const Context =
  // @ts-ignore
  createContext<{ brsAuth: BrsAuth; brsApi: BrsApi; googleAuth: GoogleAuth }>();

export default Context;
