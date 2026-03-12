import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import os from "os";
import path from "path";
import http from "http";
import fs from "fs/promises";
import { fileURLToPath } from "url";

import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);

// Load ticker symbols from tickers.txt at the project root
const tickersPath = path.join(__dirname, "..", "..", "tickers.txt");
let tickers: string[] = [];
try {
  const raw = await fs.readFile(tickersPath, "utf-8");
  tickers = raw.split("\n").map(s => s.trim()).filter(Boolean);
} catch {
  console.warn("Could not read tickers.txt, using defaults");
  tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"];
}

// Load crypto ticker symbols from crypto_tickers.txt at the project root
const cryptoTickersPath = path.join(__dirname, "..", "..", "crypto_tickers.txt");
let cryptoTickers: string[] = [];
try {
  const raw = await fs.readFile(cryptoTickersPath, "utf-8");
  cryptoTickers = raw.split("\n").map(s => s.trim()).filter(Boolean);
} catch {
  console.warn("Could not read crypto_tickers.txt, using defaults");
  cryptoTickers = ["BTC", "ETH", "SOL", "XRP", "DOGE"];
}

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

/* -------------------- REST ENDPOINTS -------------------- */

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/login", (_req, res) => {
  const token = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

app.get("/api/metrics", (_req, res) => {
  const memory = process.memoryUsage();

  res.json({
    server: {
      uptimeSeconds: process.uptime(),
      nodeVersion: process.version,
      pid: process.pid,
      env: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString()
    },
    memory: {
      rssMB: Math.round(memory.rss / 1024 / 1024),
      heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024)
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpuCores: os.cpus().length,
      loadAvg: os.loadavg(),
      lanIp: Object.values(os.networkInterfaces())
        .flat()
        .find((iface) => iface?.family === "IPv4" && !iface.internal)
        ?.address ?? "unavailable"
    }
  });
});

app.get("/api/stocks", async (_req, res) => {
  try {
    const parseNum = (s: string | undefined) =>
      s ? parseFloat(s.replace(/[^0-9.\-]/g, "")) : null;

    const results = await Promise.all(
      tickers.map(async (symbol) => {
        try {
          const url = `https://api.nasdaq.com/api/quote/${symbol}/info?assetclass=stocks`;
          const r = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" }
          });
          if (!r.ok) return { symbol, name: symbol, price: null, change: null, changePercent: null, volume: null, dayHigh: null, dayLow: null };
          const json = await r.json() as any;
          const d = json?.data;
          const p = d?.primaryData;
          const dayrange: string = d?.keyStats?.dayrange?.value ?? "";
          const [dayLowStr, dayHighStr] = dayrange.split(" - ");
          return {
            symbol,
            name: (d?.companyName ?? symbol).replace(/ Common Stock$/, "").replace(/ Class [A-Z]$/, ""),
            price: parseNum(p?.lastSalePrice),
            change: parseNum(p?.netChange),
            changePercent: parseNum(p?.percentageChange),
            volume: parseNum(p?.volume),
            dayHigh: parseNum(dayHighStr),
            dayLow: parseNum(dayLowStr),
          };
        } catch {
          return { symbol, name: symbol, price: null, change: null, changePercent: null, volume: null, dayHigh: null, dayLow: null };
        }
      })
    );
    res.json({ quotes: results, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/stocks/tickers", (req, res) => {
  const { symbol } = req.body as { symbol?: string };
  if (!symbol || typeof symbol !== "string") {
    res.status(400).json({ error: "symbol is required" });
    return;
  }
  const upper = symbol.trim().toUpperCase();
  if (!upper || !/^[A-Z]{1,10}$/.test(upper)) {
    res.status(400).json({ error: "Invalid ticker symbol" });
    return;
  }
  if (tickers.includes(upper)) {
    res.status(409).json({ error: `${upper} is already in the list` });
    return;
  }
  tickers.push(upper);
  res.json({ symbol: upper, tickers });
});

app.delete("/api/stocks/tickers/:symbol", (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const idx = tickers.indexOf(symbol);
  if (idx === -1) {
    res.status(404).json({ error: `${symbol} not found` });
    return;
  }
  tickers.splice(idx, 1);
  res.json({ symbol, tickers });
});

app.get("/api/crypto", async (_req, res) => {
  try {
    const parseNum = (s: string | undefined) =>
      s ? parseFloat(s.replace(/[^0-9.\-]/g, "")) : null;

    const results = await Promise.all(
      cryptoTickers.map(async (symbol) => {
        try {
          const url = `https://api.nasdaq.com/api/quote/${symbol}/info?assetclass=crypto`;
          const r = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" }
          });
          if (!r.ok) return { symbol, name: symbol, price: null, change: null, changePercent: null, volume: null, dayHigh: null, dayLow: null, marketCap: null };
          const json = await r.json() as any;
          const d = json?.data;
          const p = d?.primaryData;
          const dayrange: string = d?.keyStats?.dayrange?.value ?? "";
          const [dayLowStr, dayHighStr] = dayrange.split(" - ");
          const marketCapStr: string = d?.keyStats?.marketcap?.value ?? "";
          return {
            symbol,
            name: d?.companyName ?? symbol,
            price: parseNum(p?.lastSalePrice),
            change: parseNum(p?.netChange),
            changePercent: parseNum(p?.percentageChange),
            volume: parseNum(p?.volume),
            dayHigh: parseNum(dayHighStr),
            dayLow: parseNum(dayLowStr),
            marketCap: parseNum(marketCapStr),
          };
        } catch {
          return { symbol, name: symbol, price: null, change: null, changePercent: null, volume: null, dayHigh: null, dayLow: null, marketCap: null };
        }
      })
    );
    res.json({ quotes: results, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/crypto/tickers", (req, res) => {
  const { symbol } = req.body as { symbol?: string };
  if (!symbol || typeof symbol !== "string") {
    res.status(400).json({ error: "symbol is required" });
    return;
  }
  const upper = symbol.trim().toUpperCase();
  if (!upper || !/^[A-Z0-9]{1,10}$/.test(upper)) {
    res.status(400).json({ error: "Invalid ticker symbol" });
    return;
  }
  if (cryptoTickers.includes(upper)) {
    res.status(409).json({ error: `${upper} is already in the list` });
    return;
  }
  cryptoTickers.push(upper);
  res.json({ symbol: upper, tickers: cryptoTickers });
});

app.delete("/api/crypto/tickers/:symbol", (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const idx = cryptoTickers.indexOf(symbol);
  if (idx === -1) {
    res.status(404).json({ error: `${symbol} not found` });
    return;
  }
  cryptoTickers.splice(idx, 1);
  res.json({ symbol, tickers: cryptoTickers });
});

/* -------------------- GRAPHQL -------------------- */

const typeDefs = `#graphql
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: () => "Hello from GraphQL"
  }
};

const gqlServer = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })]
});

await gqlServer.start();
app.use("/graphql", expressMiddleware(gqlServer));

/* -------------------- SERVE REACT (PRODUCTION) -------------------- */

const publicPath = path.join(process.cwd(), "public");
app.use(express.static(publicPath));

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

/* -------------------- START SERVER -------------------- */

const PORT = Number(process.env.PORT || 3000);
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
