import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useContent } from "../context/ContentContext";
import { api } from "../api";
import "../styles/app.css";

export default function Profile() {
  const { user, refresh } = useAuth();
  const { t } = useContent();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const [handle, setHandle] = useState(user?.handle || "");
  const [handleError, setHandleError] = useState("");
  const [handleSuccess, setHandleSuccess] = useState("");
  const [handleLoading, setHandleLoading] = useState(false);

  async function submitPassword(e) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    setPwLoading(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setPwSuccess("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwLoading(false);
    }
  }

  async function submitHandle(e) {
    e.preventDefault();
    setHandleError("");
    setHandleSuccess("");
    setHandleLoading(true);
    try {
      const res = await api.setHandle(handle);
      setHandleSuccess(`Your unique address is now ${t("profile.handle_prefix", "prospera.co/")}${res.handle}`);
      refresh();
    } catch (err) {
      setHandleError(err.message);
    } finally {
      setHandleLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("profile.eyebrow", "Personnel file")}</div>
          <h1 className="display page-title">{t("profile.title", "Profile")}</h1>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>{t("profile.password_title", "Change password")}</h3>
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 18 }}>
            {t("profile.password_body", "Use a password you don't use anywhere else.")}
          </p>
          {pwError && <div className="error-banner">{pwError}</div>}
          {pwSuccess && <div className="success-banner">{pwSuccess}</div>}
          <form onSubmit={submitPassword}>
            <div className="field">
              <label htmlFor="current">{t("profile.current_password_label", "Current password")}</label>
              <input
                id="current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="new">{t("profile.new_password_label", "New password")}</label>
              <input
                id="new"
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <button className="primary" type="submit" disabled={pwLoading}>
              {pwLoading ? t("profile.password_button_loading", "Updating…") : t("profile.password_button", "Update password")}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>{t("profile.handle_title", "Unique address")}</h3>
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 18 }}>
            {t("profile.handle_body", "Claim a unique callsign for your public profile. Letters, numbers, and hyphens only.")}
          </p>
          {handleError && <div className="error-banner">{handleError}</div>}
          {handleSuccess && <div className="success-banner">{handleSuccess}</div>}
          <form onSubmit={submitHandle}>
            <div className="field">
              <label htmlFor="handle">{t("profile.handle_label", "Address")}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="faint mono" style={{ fontSize: 13 }}>{t("profile.handle_prefix", "prospera.co/")}</span>
                <input
                  id="handle"
                  className="mono"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase())}
                  placeholder="your-callsign"
                  required
                />
              </div>
            </div>
            <button className="primary" type="submit" disabled={handleLoading}>
              {handleLoading ? t("profile.handle_button_loading", "Saving…") : t("profile.handle_button", "Save address")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
