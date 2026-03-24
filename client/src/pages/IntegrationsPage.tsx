import { Link } from "react-router-dom";

export function IntegrationsPage() {
  return (
    <section className="stack">
      <div className="panel">
        <h2>Integrations</h2>
        <p>Connect external services to automatically populate your inventory.</p>
      </div>

      <div className="panel integration-card">
        <div className="integration-card-header">
          <div className="integration-icon">🧾</div>
          <div>
            <h3>Receipt Scanner</h3>
            <p>Photo or upload a grocery receipt — items are detected and bulk-added to your inventory automatically.</p>
          </div>
          <span className="integration-badge active">Active</span>
        </div>
        <div className="integration-card-meta">
          <span>Powered by TabScanner OCR</span>
        </div>
        <Link to="/scan-receipt" className="button">
          Scan a Receipt
        </Link>
      </div>

      <div className="panel integration-card">
        <div className="integration-card-header">
          <div className="integration-icon">🛒</div>
          <div>
            <h3>Grocery App Sync</h3>
            <p>Automatically sync your cart from Instacart, Kroger, or Walmart when an order is delivered.</p>
          </div>
          <span className="integration-badge coming-soon">Coming Soon</span>
        </div>
        <button className="button ghost" disabled>Connect</button>
      </div>

      <div className="panel integration-card">
        <div className="integration-card-header">
          <div className="integration-icon">📧</div>
          <div>
            <h3>Order Email Import</h3>
            <p>Grant read-only Gmail or Outlook access — we'll parse delivery confirmation emails automatically.</p>
          </div>
          <span className="integration-badge coming-soon">Coming Soon</span>
        </div>
        <button className="button ghost" disabled>Connect</button>
      </div>
    </section>
  );
}
