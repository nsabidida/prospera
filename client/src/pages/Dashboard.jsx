import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useContent } from "../context/ContentContext";
import RankBadge from "../components/RankBadge";
import "../styles/app.css";

function formatDate(s) {
  return new Date(s.replace(" ", "T") + "Z").toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const { t } = useContent();

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <div className="muted">Loading dashboard…</div>;

  const { user, rank, directReferrals, recentTransactions } = data;

  const TYPE_LABEL = {
    signup: t("dashboard.tx_signup", "Welcome bonus"),
    referral: t("dashboard.tx_referral", "Network growth bonus"),
    code: t("dashboard.tx_code", "Boost code"),
    admin_adjust: t("dashboard.tx_admin_adjust", "Prospera HQ adjustment"),
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("dashboard.eyebrow", "Member home")}</div>
          <h1 className="display page-title">
            {t("dashboard.welcome_prefix", "Welcome back,")} {user.name.split(" ")[0]}
          </h1>
        </div>
        <Link to="/app/organization"><button className="primary">{t("dashboard.invite_button", "Invite someone to Prospera")}</button></Link>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-label">{t("dashboard.stat_points", "Prosperity points")}</div>
          <div className="stat-value">{user.points.toLocaleString()}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">{t("dashboard.stat_rank", "Current rank")}</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{rank.current?.name}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">{t("dashboard.stat_referrals", "People you've brought in")}</div>
          <div className="stat-value">{directReferrals}</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 15 }}>{t("dashboard.activity_title", "Recent activity")}</h3>
          {recentTransactions.length === 0 ? (
            <div className="empty-state">{t("dashboard.activity_empty", "No activity yet — invite your first Prosperian to get started.")}</div>
          ) : (
            <table>
              <thead>
                <tr><th>Event</th><th>Amounts($)</th><th>Date</th></tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{TYPE_LABEL[tx.type] || tx.type}{tx.note ? <div className="faint" style={{ fontSize: 11.5 }}>{tx.note}</div> : null}</td>
                    <td className={tx.points >= 0 ? "pts-positive" : "pts-negative"}>
                      {tx.points >= 0 ? "$+" : "$"}{tx.points}
                    </td>
                    <td className="faint" style={{ fontSize: 12.5 }}>{formatDate(tx.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <h3 style={{ fontSize: 15 }}>{t("dashboard.rank_progress_title", "Rank progress")}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <RankBadge emblem={rank.current?.emblem} size={54} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{rank.current?.name}</div>
              <div className="faint" style={{ fontSize: 12 }}>
                {rank.next
                  ? `${t("dashboard.next_rank_prefix", "Next:")} ${rank.next.name} at ${rank.next.min_points.toLocaleString()} pts`
                  : t("dashboard.top_rank_label", "Top rank reached")}
              </div>
            </div>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${rank.progressPct}%` }} />
          </div>
          <div className="faint" style={{ fontSize: 12 }}>{rank.progressPct}{t("dashboard.progress_suffix", "% to next rank")}</div>

          <hr className="hairline-divider" />

          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{t("dashboard.referral_code_label", "Your referral code")}</div>
            <div className="copy-row">
              <input readOnly className="mono" value={user.referral_code} />
              <button onClick={() => navigator.clipboard.writeText(user.referral_code)}>{t("dashboard.copy_button", "Copy")}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
