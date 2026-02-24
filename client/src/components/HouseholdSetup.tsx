import { FormEvent, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

export function HouseholdSetup() {
  const { refresh } = useAuth();
  const [createName, setCreateName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await api.createHousehold({ name: createName });
      setCreateName("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create household");
    }
  };

  const join = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await api.joinHousehold({ inviteCode });
      setInviteCode("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join household");
    }
  };

  return (
    <section className="panel stack">
      <h3>Household Setup</h3>
      <div className="split">
        <div className="mini-card">
          <h4>Create Household</h4>
          <form onSubmit={(event) => void create(event)} className="stack">
            <input
              required
              placeholder="Household name"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
            />
            <button className="button">Create</button>
          </form>
        </div>
        <div className="mini-card">
          <h4>Join Household</h4>
          <form onSubmit={(event) => void join(event)} className="stack">
            <input
              required
              placeholder="Invite code"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
            />
            <button className="button secondary">Join</button>
          </form>
        </div>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
