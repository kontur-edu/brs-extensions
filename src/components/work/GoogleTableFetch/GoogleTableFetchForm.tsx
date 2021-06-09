import { TextField } from "@material-ui/core";
import SubmitWithLoading from "../../shared/SubmitWithLoading";
import React, { FormEvent, useState } from "react";
import { TABLE_URL_PATTERN, TABLE_TEMPLATE_URL } from "../../../Constants";

export default function GoogleTableFetchForm({ loading, onSubmit }: Props) {
  const [tableUrl, setTableUrl] = useState("");
  const [urlError, setUrlError] = useState(null as null | string);

  const handleUrlChanged = (event: React.ChangeEvent<{ value: string }>) => {
    const target = event.target;
    if (urlError) setUrlError(null);
    setTableUrl(target.value);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const regExp =
      /d\/(?<spreadsheetId>[a-zA-Z0-9-_]+)\/edit(#gid=(?<sheetId>[0-9]+))?/;
    const spreadsheetInfo = tableUrl.match(regExp);

    if (!spreadsheetInfo?.groups || !spreadsheetInfo.groups.spreadsheetId) {
      setUrlError("Неверный url-адрес.");
      return null;
    }

    const spreadsheetId = spreadsheetInfo.groups.spreadsheetId;
    const maybeSheetId = spreadsheetInfo.groups.sheetId || null;

    onSubmit(spreadsheetId, maybeSheetId);
  };

  return (
    <form onSubmit={handleSubmit} className="vertical-margin-min">
      <TextField
        name="table-url"
        label={"Ссылка вида " + TABLE_TEMPLATE_URL}
        type="text"
        className="tableUrl"
        value={tableUrl}
        onChange={handleUrlChanged}
        error={!!urlError}
        helperText={urlError}
        required
      />
      <SubmitWithLoading
        title="загрузить"
        loading={loading}
        className="submit"
      />
      <a
        href={TABLE_URL_PATTERN}
        target="_blank"
        rel="noreferrer"
        className="button-link"
      >
        Пример таблицы для экспорта в БРС
      </a>
    </form>
  );
}

interface Props {
  loading: boolean;
  onSubmit: (spreadsheetId: string, sheetId: string | null) => void;
}
