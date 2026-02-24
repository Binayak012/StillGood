import { useEffect, useState } from "react";
import { api } from "../api/client";

export function IntegrationsPage() {
  const [card, setCard] = useState<{
    title: string;
    connected: boolean;
    description: string;
  } | null>(null);

  useEffect(() => {
    api.integrationsStatus()
      .then((response) => setCard(response))
      .catch(() =>
        setCard({
          title: "Auto-sync with grocery apps (Coming Soon)",
          connected: false,
          description:
            "Automatically updates freshness using grocery app data integration (in development)."
        })
      );
  }, []);

  return (
    <section className="panel">
      <h2>Integrations</h2>
      <article className="integration-card">
        <h3>{card?.title ?? "Auto-sync with grocery apps (Coming Soon)"}</h3>
        <p>
          {card?.description ??
            "Automatically updates freshness using grocery app data integration (in development)."}
        </p>
        <button className="button" disabled>
          Connect (Disabled)
        </button>
      </article>
    </section>
  );
}
