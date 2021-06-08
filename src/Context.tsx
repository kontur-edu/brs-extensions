import { createContext } from "react";
import BrsAuth from "./apis/BrsAuth";
import BrsApi from "./apis/BrsApi";
import GoogleAuth from "./apis/GoogleAuth";

const Context =
  createContext<{
    brsAuth: BrsAuth;
    brsApi: BrsApi;
    googleAuth: GoogleAuth;
  } | null>(null);

export default Context;
