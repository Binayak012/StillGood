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
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <StillGoodLogo className="logo-mark" />
          <div className="sidebar-brand-meta">
            <strong>StillGood</strong>
            <span className="brand-tag">Prototype</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
            >
              <span className="sidebar-link-dot" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase() ?? "?"}</div>
            <div className="sidebar-user-meta">
              <strong>{user?.name}</strong>
              <span>{household?.name ?? "No household"}</span>
            </div>
          </div>
          <button className="button ghost sidebar-logout" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </aside>

      <div className="main-area">
        {user ? <OnboardingOverlay userId={user.id} householdName={household?.name ?? null} /> : null}
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
