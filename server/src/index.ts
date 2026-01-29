import path from "path";
import os from "os";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { ApolloServer } from "apollo-server-express";

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

app.post("/api/login", (_req, res) => {
  const token = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
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

const typeDefs = `
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: () => "Hello from GraphQL"
  }
};

const gqlServer = new ApolloServer({ typeDefs, resolvers });
await gqlServer.start();
gqlServer.applyMiddleware({ app });

// Serve React static files
const publicPath = path.join(process.cwd(), "public");
app.use(express.static(publicPath));

// Fallback to index.html for React router
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
