interface BarData {
  label: string;
  value: number;
  tone: "good" | "bad";
}

export function BarChart({ data, title }: { data: BarData[]; title: string }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <section className="panel">
      <h3>{title}</h3>
      <div className="bars">
        {data.map((item) => (
          <div key={item.label} className="bar-item">
            <div
              className={`bar-fill ${item.tone}`}
              style={{ height: `${Math.max((item.value / max) * 160, 10)}px` }}
              title={`${item.label}: ${item.value}`}
            />
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
