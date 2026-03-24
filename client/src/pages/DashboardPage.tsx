import { useCallback, useEffect, useMemo, useState } from "react";
import { api, Item, RecipeSuggestion } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { HouseholdSetup } from "../components/HouseholdSetup";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../auth/AuthProvider";

function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Expires today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

function freshnessPercent(daysRemaining: number): number {
  if (daysRemaining <= 0) return 0;
  return Math.min(100, Math.max(8, Math.round((daysRemaining / 30) * 100)));
}

function ItemTable({ items, statusFilter, onAction, onEdit }: {
  items: Item[];
  statusFilter: "active" | "archived";
  onAction: (action: () => Promise<void>) => Promise<void>;
  onEdit: (item: Item) => Promise<void>;
}) {
  if (items.length === 0) return null;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Qty</th>
            <th>Status</th>
            <th>Freshness</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className={`row-${item.status.toLowerCase()}`}>
              <td>{item.name}</td>
              <td>{item.category}</td>
              <td>{item.quantity}</td>
              <td>
                <StatusBadge status={item.status} opened={item.opened} />
              </td>
              <td>
                <div className="freshness-cell">
                  <span className="freshness-label">{daysLabel(item.daysRemaining)}</span>
                  <div className="freshness-bar">
                    <div
                      className={`freshness-fill ${item.status.toLowerCase()}`}
                      style={{ width: `${freshnessPercent(item.daysRemaining)}%` }}
                    />
                  </div>
                </div>
              </td>
              <td>
                <div className="row">
                  {statusFilter === "active" ? (
                    <>
                      <button
                        className="button tiny"
                        disabled={item.opened === true}
                        onClick={() => void onAction(() => api.openItem(item.id).then(() => undefined))}
                      >
                        {item.opened === true ? "Opened" : "Open"}
                      </button>
                      <button
                        className="button tiny secondary"
                        onClick={() => void onAction(() => api.consumeItem(item.id).then(() => undefined))}
                      >
                        Consume
                      </button>
                      <button className="button tiny ghost" onClick={() => void onEdit(item)}>
                        Edit
                      </button>
                    </>
                  ) : null}
                  <button
                    className="button tiny danger"
                    onClick={() => void onAction(() => api.deleteItem(item.id).then(() => undefined))}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardPage() {
  const { household } = useAuth();
  const [statusFilter, setStatusFilter] = useState<"active" | "archived">("active");
  const [items, setItems] = useState<Item[]>([]);
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      const [itemsResponse, recipeResponse] = await Promise.all([
        api.listItems(statusFilter),
        statusFilter === "active" ? api.recipeSuggestions() : Promise.resolve({ suggestions: [] })
      ]);
      setItems(itemsResponse.items);
      setSuggestions(recipeResponse.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [household, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => ({
    fresh: items.filter((i) => i.status === "FRESH").length,
    useSoon: items.filter((i) => i.status === "USE_SOON").length,
    expired: items.filter((i) => i.status === "EXPIRED").length
  }), [items]);

  const grouped = useMemo(() => ({
    expired: items.filter((i) => i.status === "EXPIRED"),
    useSoon: items.filter((i) => i.status === "USE_SOON"),
    fresh: items.filter((i) => i.status === "FRESH")
  }), [items]);

  const runItemAction = async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  };

  const quickEdit = async (item: Item) => {
    const nextName = window.prompt("Item name", item.name);
    if (nextName === null) return;
    const nextQuantity = window.prompt("Quantity", item.quantity);
    if (nextQuantity === null) return;
    const nextCustomDays = window.prompt(
      "Custom fresh days (blank for none)",
      item.customFreshDays?.toString() ?? ""
    );
    if (nextCustomDays === null) return;
    const customFreshDays = nextCustomDays.trim() === "" ? null : Number(nextCustomDays.trim());
    await runItemAction(async () => {
      await api.updateItem(item.id, {
        name: nextName,
        quantity: nextQuantity,
        customFreshDays: Number.isNaN(customFreshDays) ? null : customFreshDays
      });
    });
  };

  if (!household) {
    return (
      <section className="stack">
        <div className="panel">
          <h2>Join or create a household</h2>
          <p>Shared household inventory unlocks item tracking, alerts, and analytics.</p>
        </div>
        <HouseholdSetup />
      </section>
    );
  }

  return (
    <section className="stack">
      <section className="panel dashboard-hero">
        <div>
          <h2>Inventory Overview</h2>
          <p>Monitor freshness in real time and act before food gets wasted.</p>
        </div>
        <div className="hero-badge">{items.length} {items.length === 1 ? "item" : "items"}</div>
      </section>

      <div className="metric-grid">
        <article className="metric-card fresh">
          <span>Fresh</span>
          <strong>{stats.fresh}</strong>
        </article>
        <article className="metric-card use-soon">
          <span>Use Soon</span>
          <strong>{stats.useSoon}</strong>
        </article>
        <article className="metric-card expired">
          <span>Expired</span>
          <strong>{stats.expired}</strong>
        </article>
      </div>

      <section className="panel">
        <div className="row between">
          <h2>Inventory</h2>
          <div className="segmented">
            <button
              className={statusFilter === "active" ? "active" : ""}
              onClick={() => setStatusFilter("active")}
            >
              Active
            </button>
            <button
              className={statusFilter === "archived" ? "active" : ""}
              onClick={() => setStatusFilter("archived")}
            >
              Archived
            </button>
          </div>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {loading ? <p className="subtle">Loading…</p> : null}

        {!loading && items.length === 0 ? (
          <EmptyState
            title="No inventory yet"
            description="Add your first item to start freshness tracking."
          />
        ) : statusFilter === "active" ? (
          <>
            {grouped.expired.length > 0 && (
              <ItemTable
                items={grouped.expired}
                statusFilter={statusFilter}
                onAction={runItemAction}
                onEdit={quickEdit}
              />
            )}
            {grouped.useSoon.length > 0 && (
              <ItemTable
                items={grouped.useSoon}
                statusFilter={statusFilter}
                onAction={runItemAction}
                onEdit={quickEdit}
              />
            )}
            {grouped.fresh.length > 0 && (
              <ItemTable
                items={grouped.fresh}
                statusFilter={statusFilter}
                onAction={runItemAction}
                onEdit={quickEdit}
              />
            )}
          </>
        ) : (
          <ItemTable
            items={items}
            statusFilter={statusFilter}
            onAction={runItemAction}
            onEdit={quickEdit}
          />
        )}
      </section>

      {statusFilter === "active" ? (
        <section className="panel">
          <h2>Recipe Ideas</h2>
          <p>Based on your use-soon items.</p>
          {suggestions.length === 0 ? (
            <EmptyState
              title="No recipe matches yet"
              description="Use soon items will trigger recipe suggestions here."
            />
          ) : (
            <div className="recipe-grid">
              {suggestions.map((recipe) => (
                <article className="recipe-card" key={recipe.name}>
                  {recipe.image && (
                    <img src={recipe.image} alt={recipe.name} className="recipe-image" />
                  )}
                  <div className="recipe-card-body">
                    {recipe.sourceUrl ? (
                      <h3>
                        <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
                          {recipe.name}
                        </a>
                      </h3>
                    ) : (
                      <h3>{recipe.name}</h3>
                    )}
                    <p className="recipe-matched">Uses: {recipe.matchedIngredients.join(", ")}</p>
                    {recipe.timeEstimate && <p className="recipe-time">{recipe.timeEstimate}</p>}
                    {recipe.shortSteps.length > 0 && (
                      <ol className="recipe-steps">
                        {recipe.shortSteps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}
