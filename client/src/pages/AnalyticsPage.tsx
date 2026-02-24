import { useCallback, useEffect, useState } from "react";
import { AnalyticsEvents, AnalyticsSummary, api } from "../api/client";
import { BarChart } from "../components/BarChart";
import { EmptyState } from "../components/EmptyState";
import { HouseholdSetup } from "../components/HouseholdSetup";
import { useAuth } from "../auth/AuthProvider";

export function AnalyticsPage() {
  const { household } = useAuth();
  const [range, setRange] = useState<"week" | "month">("week");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [events, setEvents] = useState<AnalyticsEvents | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!household) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [summaryData, eventsData] = await Promise.all([
        api.analyticsSummary(),
        api.analyticsEvents(range)
      ]);
      setSummary(summaryData);
      setEvents(eventsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [household, range]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!household) {
    return (
      <section className="stack">
        <div className="panel">
          <h2>Create or join a household</h2>
          <p>Analytics are calculated at household level.</p>
        </div>
        <HouseholdSetup />
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="row between">
        <h2>Analytics</h2>
        <select value={range} onChange={(event) => setRange(event.target.value as "week" | "month")}>
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
        </select>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      {loading ? <p>Loading analytics...</p> : null}
      {summary ? (
        <div className="metric-grid">
          <article className="metric-card">
            <span>Added This Week</span>
            <strong>{summary.itemsAddedThisWeek}</strong>
          </article>
          <article className="metric-card">
            <span>Consumed This Week</span>
            <strong>{summary.itemsConsumedThisWeek}</strong>
          </article>
          <article className="metric-card">
            <span>Expired This Week</span>
            <strong>{summary.itemsExpiredThisWeek}</strong>
          </article>
          <article className="metric-card">
            <span>Estimated Savings</span>
            <strong>${summary.estimatedSavings.toFixed(2)}</strong>
          </article>
        </div>
      ) : null}

      {summary ? (
        <BarChart
          title="Consumed vs Expired"
          data={[
            { label: "Consumed", value: summary.consumedVsExpired.consumed, tone: "good" },
            { label: "Expired", value: summary.consumedVsExpired.expired, tone: "bad" }
          ]}
        />
      ) : null}

      <section className="panel">
        <h3>Trend ({range})</h3>
        {!events || events.series.length === 0 ? (
          <EmptyState
            title="No analytics events"
            description="Open, consume, and let items expire to generate trends."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Consumed</th>
                  <th>Expired</th>
                </tr>
              </thead>
              <tbody>
                {events.series.map((row) => (
                  <tr key={row.date}>
                    <td>{row.date}</td>
                    <td>{row.consumed}</td>
                    <td>{row.expired}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h3>Top Categories Wasted</h3>
        {!events || events.topCategoriesWasted.length === 0 ? (
          <EmptyState title="No wasted categories" description="Great job keeping waste low." />
        ) : (
          <ul className="list-clean">
            {events.topCategoriesWasted.map((entry) => (
              <li key={entry.category}>
                <span>{entry.category}</span>
                <strong>{entry.count}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
