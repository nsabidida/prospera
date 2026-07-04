import "../styles/auth.css";
import { useContent } from "../context/ContentContext";
import BrandMark from "./BrandMark";

export default function AuthShell({ eyebrow, title, subtitle, children }) {
  const { t } = useContent();
  const heroTitle = t("auth.hero.title", "Create. Build.\nProsper.");

  return (
    <div className="auth-shell">
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <div className="brand">
            <BrandMark size={30} />
            <div className="display" style={{ fontSize: 20 }}>{t("brand.name", "Prospera")}</div>
          </div>

          <div className="auth-hero-copy">
            <div className="eyebrow">{t("auth.hero.eyebrow", "A movement for prosperity")}</div>
            <h1 className="display auth-hero-title">
              {heroTitle.split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  {i < heroTitle.split("\n").length - 1 && <br />}
                </span>
              ))}
            </h1>
            <p className="muted" style={{ maxWidth: 380, lineHeight: 1.6 }}>
              {t(
                "auth.hero.body",
                "Prospera is a movement for people building their own path to prosperity. Grow your network, hit your objectives, and rise from Seed to Pillar as a Prosperian."
              )}
            </p>
          </div>

          <div className="auth-hero-insignia" aria-hidden="true">
            <svg viewBox="0 0 200 200" width="140" height="140">
              <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
              <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
              <path d="M60 118 L100 78 L140 118" stroke="var(--brass)" strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d="M70 136 L100 106 L130 136" stroke="var(--brass)" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.55" />
            </svg>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-card">
          <div className="eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>
          <h2 className="display" style={{ fontSize: 26, marginBottom: 6 }}>{title}</h2>
          {subtitle && <p className="muted" style={{ marginBottom: 24, fontSize: 14 }}>{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
