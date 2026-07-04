import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useContent } from "../context/ContentContext";
import RankBadge from "./RankBadge";
import BrandMark from "./BrandMark";
import "../styles/layout.css";

export default function Layout({ admin = false }) {
  const { user, rank, logout } = useAuth();
  const { t } = useContent();
  const navigate = useNavigate();

  const userLinks = [
    { to: "/app", label: t("nav.dashboard", "Dashboard"), end: true },
    { to: "/app/organization", label: t("nav.organization", "My Network") },
    { to: "/app/leaderboard", label: t("nav.leaderboard", "Leaderboard") },
    { to: "/app/redeem", label: t("nav.redeem", "Redeem Boost") },
    { to: "/app/profile", label: t("nav.profile", "Profile") },
  ];

  const adminLinks = [
    { to: "/hq", label: t("nav.hq_overview", "Overview"), end: true },
    { to: "/hq/users", label: t("nav.hq_users", "Prosperians") },
    { to: "/hq/codes", label: t("nav.hq_codes", "Boost Codes") },
    { to: "/hq/settings", label: t("nav.hq_settings", "Point Rules & Ranks") },
    { to: "/hq/content", label: t("nav.hq_content", "Site Text") },
  ];

  const links = admin ? adminLinks : userLinks;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <BrandMark size={30} />
          <div>
            <div className="display brand-name">{t("brand.name", "Prospera")}</div>
            <div className="eyebrow">{admin ? t("nav.command_hq", "Prospera HQ") : t("nav.field_ops", "Member Home")}</div>
          </div>
        </div>

        <nav className="nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {admin && user?.role === "admin" && (
            <NavLink to="/app" className="nav-link ghost-link">
              {t("nav.back_to_app", "← Back to Member Home")}
            </NavLink>
          )}
          <button className="ghost" onClick={handleLogout} style={{ width: "100%" }}>
            {t("nav.signout", "Sign out")}
          </button>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div />
          {!admin && rank && (
            <div className="topbar-rank">
              <RankBadge emblem={rank.current?.emblem} size={36} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{rank.current?.name}</div>
                <div className="mono faint" style={{ fontSize: 11 }}>
                  {user?.points?.toLocaleString()} pts
                </div>
              </div>
            </div>
          )}
          {admin && (
            <div className="topbar-rank">
              <div className="mono faint" style={{ fontSize: 12 }}>{user?.email}</div>
            </div>
          )}
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
