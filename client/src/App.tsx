import MetricsPanel from "./MetricsPanel";

export default function App() {
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <h1>Server Metrics Dashboard</h1>
      <p style={{ opacity: 0.8 }}>
        Refreshes every 5 seconds. In dev, UI runs on :5173 and proxies API calls to :3000.
      </p>
      <MetricsPanel />
    </div>
  );
}
