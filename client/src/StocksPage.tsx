import { useEffect, useRef, useState } from "react";

interface Quote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  dayHigh: number | null;
  dayLow: number | null;
}

interface StocksResponse {
  quotes: Quote[];
  timestamp: string;
}

function fmt(n: number | null, decimals = 2) {
  if (n === null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtVol(n: number | null) {
  if (n === null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toString();
}

type SortKey = keyof Quote;
type SortDir = "asc" | "desc";

function sortedQuotes(quotes: Quote[], key: SortKey, dir: SortDir): Quote[] {
  return [...quotes].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return dir === "asc" ? cmp : -cmp;
  });
}

export default function StocksPage() {
  const [data, setData] = useState<StocksResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [newTicker, setNewTicker] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string>>(new Set());
  const [removing, setRemoving] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d: SortDir) => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function fetchQuotes() {
    try {
      const res = await fetch("/api/stocks");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: StocksResponse = await res.json();
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Failed to load quotes");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTicker(e: React.FormEvent) {
    e.preventDefault();
    const symbol = newTicker.trim().toUpperCase();
    if (!symbol) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/stocks/tickers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAddError(json.error ?? "Failed to add ticker");
      } else {
        setNewTicker("");
        await fetchQuotes();
      }
    } catch {
      setAddError("Failed to add ticker");
    } finally {
      setAdding(false);
    }
  }

  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedSymbols.size > 0 && selectedSymbols.size < quotes.length;
    }
  });

  function toggleSelect(symbol: string) {
    setSelectedSymbols(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedSymbols.size === quotes.length) {
      setSelectedSymbols(new Set());
    } else {
      setSelectedSymbols(new Set(quotes.map(q => q.symbol)));
    }
  }

  async function handleRemoveSelected() {
    if (selectedSymbols.size === 0) return;
    setRemoving(true);
    try {
      await Promise.all(
        [...selectedSymbols].map(symbol =>
          fetch(`/api/stocks/tickers/${symbol}`, { method: "DELETE" })
        )
      );
      setSelectedSymbols(new Set());
      await fetchQuotes();
    } finally {
      setRemoving(false);
    }
  }

  const quotes = data ? sortedQuotes(data.quotes, sortKey, sortDir) : [];

  const thBase: React.CSSProperties = {
    padding: "10px 14px",
    borderBottom: "2px solid #333",
    fontWeight: 600,
    whiteSpace: "nowrap",
    cursor: "pointer",
    userSelect: "none",
  };

  const tdStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderBottom: "1px solid #2a2a2a",
    whiteSpace: "nowrap",
  };

  function Th({ label, col, align = "left" }: { label: string; col: SortKey; align?: "left" | "right" }) {
    const active = sortKey === col;
    const arrow = active ? (sortDir === "asc" ? " ▲" : " ▼") : " ⇅";
    return (
      <th
        onClick={() => handleSort(col)}
        style={{ ...thBase, textAlign: align, color: active ? "#60a5fa" : "inherit" }}
      >
        {label}<span style={{ opacity: active ? 1 : 0.35, fontSize: "0.75em" }}>{arrow}</span>
      </th>
    );
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Stock Quotes</h2>
      <p style={{ opacity: 0.6, marginTop: 0 }}>
        Refreshes every 30 seconds.{" "}
        {data && (
          <span>Last updated: {new Date(data.timestamp).toLocaleTimeString()}</span>
        )}
      </p>

      {loading && <p>Loading quotes…</p>}
      {error && <p style={{ color: "#f87171" }}>Error: {error}</p>}

      <form onSubmit={handleAddTicker} style={{ display: "flex", gap: "8px", alignItems: "center", margin: "16px 0", flexWrap: "wrap" }}>
        <input
          type="text"
          value={newTicker}
          onChange={e => { setNewTicker(e.target.value.toUpperCase()); setAddError(null); }}
          placeholder="Add ticker (e.g. ORCL)"
          maxLength={10}
          disabled={adding}
          style={{
            background: "#1a1a1a",
            border: "1px solid #444",
            borderRadius: "4px",
            color: "#fff",
            padding: "6px 10px",
            fontSize: "0.9rem",
            width: "160px",
          }}
        />
        <button
          type="submit"
          disabled={adding || !newTicker.trim()}
          style={{
            background: "#2563eb",
            border: "none",
            borderRadius: "4px",
            color: "#fff",
            padding: "6px 14px",
            fontSize: "0.9rem",
            cursor: adding || !newTicker.trim() ? "not-allowed" : "pointer",
            opacity: adding || !newTicker.trim() ? 0.5 : 1,
          }}
        >
          {adding ? "Adding…" : "Add"}
        </button>
        {selectedSymbols.size > 0 && (
          <button
            type="button"
            onClick={handleRemoveSelected}
            disabled={removing}
            style={{
              background: "#dc2626",
              border: "none",
              borderRadius: "4px",
              color: "#fff",
              padding: "6px 14px",
              fontSize: "0.9rem",
              cursor: removing ? "not-allowed" : "pointer",
              opacity: removing ? 0.5 : 1,
            }}
          >
            {removing ? "Removing…" : `Remove (${selectedSymbols.size})`}
          </button>
        )}
        {addError && <span style={{ color: "#f87171", fontSize: "0.85rem" }}>{addError}</span>}
      </form>

      {data && data.quotes.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
            <thead>
              <tr style={{ background: "#1a1a1a" }}>
                <th style={{ ...thBase, cursor: "default", padding: "10px 8px 10px 14px", width: "32px" }}>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={quotes.length > 0 && selectedSymbols.size === quotes.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer", accentColor: "#60a5fa" }}
                  />
                </th>
                <Th label="Symbol"   col="symbol" />
                <Th label="Name"     col="name" />
                <Th label="Price"    col="price"         align="right" />
                <Th label="Change"   col="change"        align="right" />
                <Th label="Change %" col="changePercent" align="right" />
                <Th label="Day High" col="dayHigh"       align="right" />
                <Th label="Day Low"  col="dayLow"        align="right" />
                <Th label="Volume"   col="volume"        align="right" />
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const positive = (q.change ?? 0) >= 0;
                const changeColor = q.change === null ? "inherit" : positive ? "#4ade80" : "#f87171";
                const isSelected = selectedSymbols.has(q.symbol);
                const rowBg = isSelected ? "rgba(96, 165, 250, 0.1)" : "transparent";
                const rowHoverBg = isSelected ? "rgba(96, 165, 250, 0.18)" : "#1e1e1e";
                return (
                  <tr key={q.symbol} style={{ background: rowBg }}
                    onMouseEnter={e => (e.currentTarget.style.background = rowHoverBg)}
                    onMouseLeave={e => (e.currentTarget.style.background = rowBg)}>
                    <td style={{ ...tdStyle, padding: "10px 8px 10px 14px" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(q.symbol)}
                        style={{ cursor: "pointer", accentColor: "#60a5fa" }}
                      />
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: "#60a5fa" }}>{q.symbol}</td>
                    <td style={{ ...tdStyle, opacity: 0.85 }}>{q.name}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>${fmt(q.price)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", color: changeColor, fontVariantNumeric: "tabular-nums" }}>
                      {q.change !== null ? (positive ? "+" : "") + fmt(q.change) : "—"}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: changeColor, fontVariantNumeric: "tabular-nums" }}>
                      {q.changePercent !== null ? (positive ? "+" : "") + fmt(q.changePercent) + "%" : "—"}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>${fmt(q.dayHigh)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>${fmt(q.dayLow)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", opacity: 0.75 }}>{fmtVol(q.volume)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
