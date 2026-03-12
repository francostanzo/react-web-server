import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import MetricsPanel from "./MetricsPanel";
import StocksPage from "./StocksPage";
import CryptoPage from "./CryptoPage";

const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  color: isActive ? "#60a5fa" : "#ccc",
  textDecoration: "none",
  fontWeight: isActive ? 600 : 400,
  padding: "6px 14px",
  borderRadius: "6px",
  background: isActive ? "rgba(96,165,250,0.1)" : "transparent",
});

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: "2rem", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", minHeight: "100vh", background: "#111", color: "#eee" }}>
        <nav style={{ display: "flex", gap: "8px", marginBottom: "2rem", borderBottom: "1px solid #2a2a2a", paddingBottom: "1rem" }}>
          <NavLink to="/" end style={navLinkStyle}>📊 Dashboard</NavLink>
          <NavLink to="/stocks" style={navLinkStyle}>📈 Stocks</NavLink>
          <NavLink to="/crypto" style={navLinkStyle}>🪙 Crypto</NavLink>
        </nav>
        <Routes>
          <Route path="/" element={
            <>
              <h1 style={{ marginTop: 0 }}>Server Metrics Dashboard</h1>
              <p style={{ opacity: 0.6, marginTop: 0 }}>Refreshes every 5 seconds.</p>
              <MetricsPanel />
            </>
          } />
          <Route path="/stocks" element={<StocksPage />} />
          <Route path="/crypto" element={<CryptoPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

