import { useEffect, useState } from "react";
import type { Metrics } from "./types";

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function MetricsPanel() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const fetchMetrics = async () => {
      try {
        setError(null);
        const res = await fetch("/api/metrics", { headers: { "Accept": "application/json" } });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }
        const data = (await res.json()) as Metrics;
        if (alive) setMetrics(data);
      } catch (e: any) {
        if (alive) setError(e?.message ?? String(e));
      }
    };

    fetchMetrics();
    const id = window.setInterval(fetchMetrics, 5000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  if (error) return <p style={{ color: "crimson" }}>Metrics error: {error}</p>;
  if (!metrics) return <p>Loading metrics…</p>;

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 900 }}>
      <section>
        <h2>Server</h2>
        <ul>
          <li>Uptime: {Math.round(metrics.server.uptimeSeconds)}s</li>
          <li>Node: {metrics.server.nodeVersion}</li>
          <li>PID: {metrics.server.pid}</li>
          <li>Env: {metrics.server.env}</li>
          <li>Timestamp: {fmtTime(metrics.server.timestamp)}</li>
        </ul>
      </section>

      <section>
        <h2>Memory (MB)</h2>
        <ul>
          <li>RSS: {metrics.memory.rssMB}</li>
          <li>Heap Used: {metrics.memory.heapUsedMB}</li>
          <li>Heap Total: {metrics.memory.heapTotalMB}</li>
        </ul>
      </section>

      <section>
        <h2>System</h2>
        <ul>
          <li>Platform: {metrics.system.platform}</li>
          <li>Arch: {metrics.system.arch}</li>
          <li>CPU Cores: {metrics.system.cpuCores}</li>
          <li>Load Avg: {metrics.system.loadAvg.join(", ")}</li>
        </ul>
      </section>
    </div>
  );
}
