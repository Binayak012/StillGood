export function StatusBadge({ status }: { status: "FRESH" | "USE_SOON" | "EXPIRED" }) {
  const label = status === "USE_SOON" ? "Use Soon" : status === "FRESH" ? "Fresh" : "Expired";
  return <span className={`status-badge ${status.toLowerCase()}`}>{label}</span>;
}
