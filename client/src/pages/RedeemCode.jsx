import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useContent } from "../context/ContentContext";
import "../styles/app.css";

export default function RedeemCode() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { refresh } = useAuth();
  const { t } = useContent();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await api.redeem(code);
      setSuccess(`${t("redeem.success_prefix", "Confirmed. +")}${res.pointsAwarded} ${t("redeem.success_suffix", "points added to your total.")}`);
      setCode("");
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("redeem.eyebrow", "Bonus intake")}</div>
          <h1 className="display page-title">{t("redeem.title", "Redeem a boost code")}</h1>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 460 }}>
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 20 }}>
          {t("redeem.body", "Prospera HQ issues boost codes for milestones, events, and special objectives. Enter yours below to add the points to your account.")}
        </p>
        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="code">{t("redeem.label", "Boost code")}</label>
            <input
              id="code"
              className="mono"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("redeem.placeholder", "e.g. PR-4K9P2X")}
              required
            />
          </div>
          <button className="primary" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? t("redeem.button_loading", "Confirming…") : t("redeem.button", "Redeem code")}
          </button>
        </form>
      </div>
    </div>
  );
}
