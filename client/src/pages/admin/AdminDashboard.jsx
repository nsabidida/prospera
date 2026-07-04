import { useEffect, useState } from "react";
import { api } from "../../api";
import { useContent } from "../../context/ContentContext";
import "../../styles/app.css";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const { t } = useContent();
  const [error, setError] = useState("");

  useEffect(() => {
    api.admin.stats().then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (!stats) return <div className="muted">Loading…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("admin.overview.eyebrow", "Prospera HQ")}</div>
          <h1 className="display page-title">{t("admin.overview.title", "Overview")}</h1>
        </div>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-label">{t("admin.overview.stat_users", "Total Prosperians")}</div>
          <div className="stat-value">{stats.totalUsers.toLocaleString()}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">{t("admin.overview.stat_points", "Points in circulation")}</div>
          <div className="stat-value">{stats.totalPoints.toLocaleString()}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">{t("admin.overview.stat_codes", "Codes redeemed")}</div>
          <div className="stat-value">{stats.totalCodesRedeemed.toLocaleString()}</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>{t("admin.overview.top_referrers_title", "Top network builders")}</h3>
          {stats.topReferrers.length === 0 ? (
            <div className="empty-state">No referral activity yet.</div>
          ) : (
            <table>
              <thead><tr><th>Leader</th><th>Org size</th></tr></thead>
              <tbody>
                {stats.topReferrers.map((r) => (
                  <tr key={r.id}><td>{r.name}</td><td className="faint">{r.org_size}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>{t("admin.overview.recent_signups_title", "Newest Prosperians")}</h3>
          <table>
            <thead><tr><th>Name</th><th>Email</th></tr></thead>
            <tbody>
              {stats.recentSignups.map((r) => (
                <tr key={r.id}><td>{r.name}</td><td className="faint">{r.email}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
