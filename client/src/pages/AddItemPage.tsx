import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { HouseholdSetup } from "../components/HouseholdSetup";
import { useAuth } from "../auth/AuthProvider";

const categories = ["dairy", "produce", "meat", "leftovers", "other"];

export function AddItemPage() {
  const navigate = useNavigate();
  const { household } = useAuth();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("produce");
  const [quantity, setQuantity] = useState("");
  const [opened, setOpened] = useState(false);
  const [customFreshDays, setCustomFreshDays] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!household) {
    return (
      <section className="stack">
        <div className="panel">
          <h2>Create or join a household first</h2>
          <p>Items belong to a household inventory.</p>
        </div>
        <HouseholdSetup />
      </section>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.createItem({
        name,
        category,
        quantity,
        opened,
        customFreshDays: customFreshDays.trim() === "" ? null : Number(customFreshDays)
      });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel stack">
      <div>
        <h2>Add Item</h2>
        <p>Use sensible defaults and override freshness only when needed.</p>
      </div>
      <form className="stack" onSubmit={(event) => void submit(event)}>
        <div className="form-grid">
          <label className="form-field">
            <span>Item Name</span>
            <input
              required
              placeholder="Milk, spinach, leftovers..."
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Quantity</span>
            <input
              required
              placeholder="1 carton"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Custom Fresh Days</span>
            <input
              placeholder="Optional override"
              value={customFreshDays}
              onChange={(event) => setCustomFreshDays(event.target.value)}
              inputMode="numeric"
            />
          </label>
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={opened}
            onChange={(event) => setOpened(event.target.checked)}
          />
          Mark as already opened
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <button className="button" disabled={saving}>
          {saving ? "Saving..." : "Add Item"}
        </button>
      </form>
    </section>
  );
}
