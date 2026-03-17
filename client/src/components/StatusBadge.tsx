export function StatusBadge({
  status,
  opened
}: {
  status: "FRESH" | "USE_SOON" | "EXPIRED";
  opened?: boolean | null;
}) {
  const freshnessLabel =
    status === "USE_SOON" ? "Use Soon" : status === "FRESH" ? "Fresh" : "Expired";
  const openedLabel = opened === true ? "Opened" : opened === false ? "Unopened" : null;
  const label = openedLabel ? `${freshnessLabel} • ${openedLabel}` : freshnessLabel;
  return <span className={`status-badge ${status.toLowerCase()}`}>{label}</span>;
}
