import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import { useContent } from "../context/ContentContext";
import { api } from "../api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { applySession } = useAuth();
  const { t } = useContent();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login({ email, password });
      applySession(data);
      navigate(data.user.role === "admin" ? "/hq" : "/app");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow={t("auth.login.eyebrow", "Sign in")}
      title={t("auth.login.title", "Welcome back")}
      subtitle={t("auth.login.subtitle", "Sign in to keep building your prosperity.")}
    >
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">{t("auth.login.email_label", "Email")}</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">{t("auth.login.password_label", "Password")}</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="primary" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? t("auth.login.submit_loading", "Signing in…") : t("auth.login.submit", "Sign in")}
        </button>
      </form>
      <div className="auth-form-footer">
        {t("auth.login.footer_text", "New to Prospera?")} <Link to="/signup">{t("auth.login.footer_link", "Join the movement")}</Link>
      </div>
    </AuthShell>
  );
}
