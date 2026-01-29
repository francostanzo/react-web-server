import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import os from "os";
import path from "path";
import http from "http";

import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";

const app = express();
const httpServer = http.createServer(app);

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
      loadAvg: os.loadavg()
    }
  });
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

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

/* -------------------- START SERVER -------------------- */

const PORT = Number(process.env.PORT || 3000);
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
