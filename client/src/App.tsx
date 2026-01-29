import React from "react";
import MetricsPanel from "./MetricsPanel";

export default function App() {
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Server Metrics Dashboard</h1>
      <MetricsPanel />
    </div>
  );
}

