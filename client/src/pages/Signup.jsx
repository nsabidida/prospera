import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import { useContent } from "../context/ContentContext";
import { api } from "../api";

export default function Signup() {
  const [params] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { applySession } = useAuth();
  const { t } = useContent();
  const navigate = useNavigate();

  useEffect(() => {
    const ref = params.get("ref");
    if (ref) setReferralCode(ref.toUpperCase());
  }, [params]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.signup({
        name,
        email,
        password,
        referralCode: referralCode || undefined,
      });
      applySession(data);
      navigate("/app");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow={t("auth.signup.eyebrow", "Join Prospera")}
      title={t("auth.signup.title", "Start your prosperity journey")}
      subtitle={t("auth.signup.subtitle", "Create your account and plant your first Seed.")}
    >
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">{t("auth.signup.name_label", "Full name")}</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="email">{t("auth.signup.email_label", "Email")}</label>
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
          <label htmlFor="password">{t("auth.signup.password_label", "Password")}</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="referral">{t("auth.signup.referral_label", "Referral code (optional)")}</label>
          <input
            id="referral"
            className="mono"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            placeholder="e.g. 7QK2P9X"
          />
        </div>
        <button className="primary" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? t("auth.signup.submit_loading", "Creating account…") : t("auth.signup.submit", "Become a Prosperian")}
        </button>
      </form>
      <div className="auth-form-footer">
        {t("auth.signup.footer_text", "Already a Prosperian?")} <Link to="/login">{t("auth.signup.footer_link", "Sign in")}</Link>
      </div>
    </AuthShell>
  );
}
