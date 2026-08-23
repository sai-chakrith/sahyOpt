# SahyOpt Web Application

The frontend dashboard for **SahyOpt** — Western Ghats Amphibian Reserve Site Selection.

Built with **Next.js 16 (App Router)**, **TypeScript**, **Prisma ORM**, **Tailwind CSS**, and **Leaflet / Recharts**.

For full project documentation, mathematical model formulations, data pipeline, and solver instructions, see the main [Repository README](../README.md).

---

## Getting Started

### 1. Environment Configuration

Ensure `web/.env` contains your database connection string and solver URL:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/sahyopt?schema=public"
SOLVER_URL="http://localhost:8000"
```

### 2. Database Migration & Seeding

```bash
npx prisma migrate deploy
npx prisma db seed
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to view the application:
- `/` — Overview Dashboard (Species count, cell richness, IUCN threat breakdown)
- `/optimize` — Interactive Solver Interface (Set Covering & MCLP model execution)
- `/map` — GIS Map Explorer (Spatial distribution of grid cells and selected reserves)
- `/sensitivity` — Sensitivity Analysis & Comparative Coverage Curves
