import { useCallback, useEffect, useState } from "react";
import { Alert, api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { HouseholdSetup } from "../components/HouseholdSetup";
import { useAuth } from "../auth/AuthProvider";

export function NotificationsPage() {
  const { household } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    if (!household) {
      return;
    }
    setError(null);
    try {
      const response = await api.alerts();
      setAlerts(response.alerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    }
  }, [household]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!household) {
    return (
      <section className="stack">
        <div className="panel">
          <h2>No household selected</h2>
          <p>Notifications are generated from your household inventory.</p>
        </div>
        <HouseholdSetup />
      </section>
    );
  }

  const runSweep = async () => {
    setRunning(true);
    setError(null);
    try {
      await api.runAlerts();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run alert sweep");
    } finally {
      setRunning(false);
    }
  };

  const markRead = async (id: string) => {
    setError(null);
    try {
      await api.readAlert(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark alert read");
    }
  };

  return (
    <section className="panel stack">
      <div className="row between">
        <h2>Notifications</h2>
        <button className="button secondary" onClick={() => void runSweep()} disabled={running}>
          {running ? "Running..." : "Run Alert Check"}
        </button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      {alerts.length === 0 ? (
        <EmptyState title="No alerts" description="You're all caught up." />
      ) : (
        <ul className="alert-list">
          {alerts.map((alert) => (
            <li key={alert.id} className={`alert-row ${alert.readAt ? "read" : "unread"}`}>
              <div>
                <strong>{alert.message}</strong>
                <p>{`${alert.item.name} - ${alert.item.category} - ${new Date(
                  alert.createdAt
                ).toLocaleString()}`}</p>
              </div>
              {!alert.readAt ? (
                <button className="button tiny" onClick={() => void markRead(alert.id)}>
                  Mark Read
                </button>
              ) : (
                <span className="subtle">Read</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
