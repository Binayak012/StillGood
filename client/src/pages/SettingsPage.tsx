import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { HouseholdSetup } from "../components/HouseholdSetup";
import { useAuth } from "../auth/AuthProvider";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "MEMBER";
}

export function SettingsPage() {
  const { user, household, setProfile, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [householdName, setHouseholdName] = useState(user?.householdName ?? "");
  const [prefsEmail, setPrefsEmail] = useState(Boolean(user?.prefsEmail));
  const [prefsInApp, setPrefsInApp] = useState(Boolean(user?.prefsInApp));
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteCode, setInviteCode] = useState(household?.inviteCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setHouseholdName(user?.householdName ?? "");
    setPrefsEmail(Boolean(user?.prefsEmail));
    setPrefsInApp(Boolean(user?.prefsInApp));
  }, [user]);

  useEffect(() => {
    setInviteCode(household?.inviteCode ?? "");
  }, [household]);

  useEffect(() => {
    if (!household) {
      setMembers([]);
      return;
    }
    api.getMembers()
      .then((response) => setMembers(response.members))
      .catch(() => setMembers([]));
  }, [household]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);
    setError(null);
    try {
      await setProfile({
        name,
        householdName: householdName.trim() === "" ? null : householdName,
        prefsEmail,
        prefsInApp
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    }
  };

  const regenerateInvite = async () => {
    setError(null);
    try {
      const response = await api.regenerateInvite();
      setInviteCode(response.inviteCode);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate invite");
    }
  };

  return (
    <section className="stack">
      <section className="panel">
        <h2>Profile & Preferences</h2>
        <form className="stack" onSubmit={(event) => void submit(event)}>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
          <input
            value={householdName}
            onChange={(event) => setHouseholdName(event.target.value)}
            placeholder="Household name (optional)"
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={prefsEmail}
              onChange={(event) => setPrefsEmail(event.target.checked)}
            />
            Email notifications
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={prefsInApp}
              onChange={(event) => setPrefsInApp(event.target.checked)}
            />
            In-app notifications
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          {saved ? <p className="success-text">Saved.</p> : null}
          <button className="button">Save Settings</button>
        </form>
      </section>

      {household ? (
        <section className="panel">
          <h2>Household</h2>
          <p>
            <strong>Name:</strong> {household.name}
          </p>
          <p>
            <strong>Role:</strong> {household.role}
          </p>
          <p>
            <strong>Invite code:</strong> {inviteCode || household.inviteCode}
          </p>
          {household.role === "OWNER" ? (
            <button className="button secondary" onClick={() => void regenerateInvite()}>
              Regenerate Invite Code
            </button>
          ) : null}
          <h3>Members</h3>
          <ul className="list-clean">
            {members.map((member) => (
              <li key={member.id}>
                <span>
                  {member.name} ({member.email})
                </span>
                <strong>{member.role}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <HouseholdSetup />
      )}
    </section>
  );
}
