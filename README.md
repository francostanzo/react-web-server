# React Web Platform (Final)

## Dev (two ports)
```bash
npm install
npm run dev
```
- UI: http://localhost:5173
- API: http://localhost:3000
- Metrics JSON: http://localhost:3000/api/metrics
- GraphQL: http://localhost:3000/graphql

## Production (single port 3000 via Docker)
```bash
cd docker
docker compose up --build
```
- UI: http://localhost:3000
- Metrics JSON: http://localhost:3000/api/metrics
- GraphQL: http://localhost:3000/graphql
