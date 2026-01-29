import { useEffect, useState } from "react";
import { Metrics } from "./types";

export default function MetricsPanel() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      const res = await fetch("/api/metrics");
      const data = await res.json();
      setMetrics(data);
    };

    fetchMetrics();
    const id = setInterval(fetchMetrics, 5000);
    return () => clearInterval(id);
  }, []);

  if (!metrics) {
    return <p>Loading metrics…</p>;
  }

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 800 }}>
      <section>
        <h2>Server</h2>
        <ul>
          <li>Uptime: {Math.round(metrics.server.uptimeSeconds)}s</li>
          <li>Node: {metrics.server.nodeVersion}</li>
          <li>PID: {metrics.server.pid}</li>
          <li>Env: {metrics.server.env}</li>
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

