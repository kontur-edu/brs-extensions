import { google } from "googleapis";
import { OAuth2Client } from "googleapis-common";
import * as googleAuth from "./googleAuth";

let globalAuth: OAuth2Client | null = null;

export async function authorizeAsync(policy: AuthorizePolicy) {
  globalAuth = await googleAuth.authorizeAsync(policy);
}

export function openSpreadsheet(spreadsheetId: string): Spreadsheet {
  const auth = getGlobalAuth();

  async function readAsync(range: string) {
    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return response.data;
  }

  function writeAsync(range: string, values: any[][], asEnteredByUser = false) {
    const sheets = google.sheets({ version: "v4", auth });
    const valueInputOption = asEnteredByUser ? "USER_ENTERED" : "RAW";
    const requestBody = {
      values,
    };
    return sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption,
      requestBody,
    });
  }

  function appendAsync(
    range: string,
    values: any[][],
    asEnteredByUser = false
  ) {
    const sheets = google.sheets({ version: "v4", auth });
    const valueInputOption = asEnteredByUser ? "USER_ENTERED" : "RAW";
    const requestBody = {
      values,
    };
    return sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption,
      requestBody,
    });
  }

  return {
    readAsync,
    writeAsync,
    appendAsync,
  };
}

function getGlobalAuth() {
  if (!globalAuth) {
    throw new Error("Not authenticated. Use authorizeAsync to authenticate");
  }
  return globalAuth;
}

export type AuthorizePolicy = googleAuth.AuthorizePolicy;

export interface Spreadsheet {
  readAsync: (range: string) => Promise<ValueRange>;
  writeAsync: (
    range: string,
    values: any[][],
    asEnteredByUser?: boolean
  ) => void;
  appendAsync: (
    range: string,
    values: any[][],
    asEnteredByUser?: boolean
  ) => void;
}

export interface ValueRange {
  majorDimension?: string | null;
  range?: string | null;
  values?: any[][] | null;
}
