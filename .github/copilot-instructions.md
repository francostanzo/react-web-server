# Copilot Instructions

## Commands

```bash
# Dev (dual-port: UI :5173, API :3000)
npm run dev               # both servers concurrently
npm run dev:server        # server only
npm run dev:client        # client only

# Build & run
npm run build             # build client then server
npm start                 # run compiled server (node dist/index.js)

# Production (single port 3000)
cd docker && docker compose up --build
```

No test or lint tooling is configured.

## Architecture

npm workspaces monorepo with two packages: `client` (Vite + React 18) and `server` (Express + Apollo Server).

**Dev**: Vite dev server on `:5173` proxies `/api` and `/graphql` to Express on `:3000`.

**Production (Docker)**: Multi-stage build compiles the React app to `client/dist/`, copies it into `server/public/`, and Express serves it as static files on a single port 3000.

The entire backend lives in **`server/src/index.ts`** — one file with REST endpoints, GraphQL schema/resolvers, static file serving, and server startup.

## Key Conventions

- **Single-file server**: All Express routes, GraphQL typedefs/resolvers, and server startup are in `server/src/index.ts`. Don't split into route files without broader refactoring.
- **GraphQL**: Extend the `typeDefs` string and `resolvers` object directly in `server/src/index.ts`.
- **No database**: Metrics are computed on-the-fly from Node's `process` and `os` modules.
- **JWT skeleton**: `POST /api/login` issues a token, but no routes validate it — auth is not enforced.
- **TypeScript**: Both workspaces extend `tsconfig.base.json` (ES2022, strict mode). Client adds `"jsx": "react-jsx"`; server outputs to `dist/`.
- **Env vars**: Server uses `process.env.*`; client uses Vite's `import.meta.env.VITE_*`. `JWT_SECRET` defaults to `"dev-secret"` if unset.
- **React build placement**: The React build must land in `server/public/` for Express to serve it. This copy is handled by the Dockerfile, not by npm scripts.
