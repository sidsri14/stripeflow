# backend

## Prerequisites

- Bun `>=1.2`
- PostgreSQL (local or remote)

## Environment

Create `backend/.env` from `.env.example`:

```bash
cp .env.example .env
```

Required variables:

- `DATABASE_URL` (PostgreSQL connection string)
- `JWT_SECRET` (long random secret)
- `DEBUG_ERRORS` (`false` by default; set `true` only for local debugging)

## Install dependencies

```bash
bun install
```

## Apply schema

```bash
bunx prisma db push
```

## Run API

```bash
bun run src/index.ts
```

## Optional: run worker

```bash
bun run src/worker.ts
```
