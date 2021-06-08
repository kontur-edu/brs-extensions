import { Button, CircularProgress, TextField } from "@material-ui/core";
import SubmitWithLoading from "../../shared/SubmitWithLoading";
import React, { FormEvent } from "react";
import "./styles.css";

const sidGainingInstruction =
  "https://docs.google.com/document/d/1btXePo-5bE8RyX7RFXnBuS-UN9SmwUithpc_UXhAWsg/edit";

export default function BrsLoginForm({
  onSubmit,
  submitting,
  loading,
  signedIn,
  onLogout,
  userName,
}: Props) {
  const [login, setLogin] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [sid, setSid] = React.useState("");

  function handleUserNameChanged(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setLogin(value);
    setSid("");
  }

  function handlePasswordChanged(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setPassword(value);
    setSid("");
  }

  function handleSidChanged(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSid(value);
    setLogin("");
    setPassword("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (loading) return;

    onSubmit({ login: login, password, sid });
  }

  return signedIn ? (
    <React.Fragment>
      <p>Добро пожаловать, {userName}</p>
      <Button
        type="button"
        fullWidth
        variant="contained"
        onClick={onLogout}
        color="primary"
      >
        Выйти из БРС
      </Button>
    </React.Fragment>
  ) : (
    <div className="brs-login-form">
      <p>
        <b>Войдите в БРС</b>, чтобы сервис мог получить информацию о ваших
        курсах и выставлять оценки от вашего имени
      </p>
      <p>Это можно сделать через учетную запись БРС</p>
      <form className="form" onSubmit={handleSubmit}>
        <TextField
          className="form-component"
          variant="outlined"
          margin="normal"
          fullWidth
          id="username"
          label="Имя пользователя"
          name="username"
          autoFocus
          value={login}
          disabled={loading}
          onChange={handleUserNameChanged}
        />
        <TextField
          className="form-component"
          variant="outlined"
          margin="normal"
          fullWidth
          name="password"
          label="Пароль"
          type="password"
          id="password"
          autoComplete="current-password"
          value={password}
          disabled={loading}
          onChange={handlePasswordChanged}
        />
        <p className="form-component text-align-center">
          или через JSESSIONID при использовании единой учетной записи УрФУ
        </p>
        <TextField
          className="form-component"
          variant="outlined"
          margin="normal"
          fullWidth
          name="sid"
          label="JSESSIONID"
          type="password"
          id="sid"
          value={sid}
          disabled={loading}
          onChange={handleSidChanged}
        />
        <a
          href={sidGainingInstruction}
          className="button-link"
          target="_blank"
          rel="noreferrer"
        >
          Как получить JSESSIONID
        </a>
        <SubmitWithLoading
          className="vertical-margin-medium"
          title="войти"
          loading={submitting}
          disabled={loading}
        />
      </form>
      {loading && (
        <CircularProgress color="primary" size={150} className="progress" />
      )}
    </div>
  );
}

interface Props {
  submitting: boolean;
  loading: boolean;
  onSubmit: (credentials: Credentials) => void;
  onLogout: () => void;
  signedIn: boolean;
  userName?: string;
}

export interface Credentials {
  login: string;
  password: string;
  sid: string;
}
