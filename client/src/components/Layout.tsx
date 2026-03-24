import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { OnboardingOverlay } from "./OnboardingOverlay";
import { StillGoodLogo } from "./StillGoodLogo";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/add-item", label: "Add Item" },
  { to: "/notifications", label: "Notifications" },
  { to: "/analytics", label: "Analytics" },
  { to: "/integrations", label: "Integrations" },
  { to: "/settings", label: "Settings" }
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, household, logout } = useAuth();

  return (
    <div className="app-shell">
      {user ? <OnboardingOverlay userId={user.id} householdName={household?.name ?? null} /> : null}

      <header className="topbar">
        <div className="brand-lockup">
          <StillGoodLogo className="logo-mark" />
          <div className="brand-meta">
            <div className="brand-title-row">
              <h1>StillGood</h1>
              <span className="brand-tag">Prototype</span>
            </div>
            <p>Freshness intelligence for everyday kitchens</p>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="household-pill">
            <span>Household</span>
            <strong>{household?.name ?? "Not set"}</strong>
          </div>
          <div className="user-chip">{user?.name}</div>
          <button className="button ghost" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </header>

      <nav className="nav-grid">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <main className="content">{children}</main>
    </div>
  );
}
