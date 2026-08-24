# SahyOpt — Western Ghats Amphibian Reserve Site Selection

An Operations Research project implementing **Set Covering (SCLP)** and **Maximal Coverage Location Problems (MCLP)** for systematic conservation planning in the Western Ghats biodiversity hotspot, using real GBIF occurrence data and IUCN Red List threat categories.

---

## 📌 Abstract

The Western Ghats of India is a global biodiversity hotspot home to over 220 amphibian species, many of which are endangered and micro-endemic. **SahyOpt** formulates and solves integer linear programming (ILP) models to identify optimal reserve networks under spatial coverage constraints and limited conservation budgets.

The codebase integrates:
- A Python data cleaning & spatial gridding pipeline (~0.1° grid cells / ~11 km resolution)
- An automated IUCN Red List & GBIF threat category and weighting resolver
- A FastAPI microservice using PuLP (CBC Solver) for exact ILP optimization
- A PostgreSQL database managed via Prisma ORM
- An interactive Next.js dashboard with GIS map visualization (Leaflet) and sensitivity analysis tools

---

## 🧮 Mathematical Formulations

### 1. Set Covering Location Problem (SCLP)
Finds the minimum number of reserve sites required to guarantee that **every species** is represented in at least one selected reserve.

**Sets & Parameters:**
- $I$: Set of candidate grid cells ($i \in I, |I| = 759$)
- $J$: Set of amphibian species ($j \in J, |J| = 220$)
- $a_{ij} \in \{0, 1\}$: Binary presence matrix ($1$ if species $j$ occurs in cell $i$, $0$ otherwise)

**Decision Variable:**
- $x_i \in \{0, 1\}$: $1$ if candidate cell $i$ is selected as a reserve, $0$ otherwise

$$\min \sum_{i \in I} x_i$$

$$\text{subject to } \sum_{i \in I} a_{ij} x_i \ge 1 \quad \forall j \in J$$

$$x_i \in \{0, 1\} \quad \forall i \in I$$

---

### 2. Maximal Coverage Location Problem (MCLP)
Given a fixed budget $K$ (maximum allowable reserves), maximizes total weighted species coverage.

**Additional Parameters & Variables:**
- $K$: Budget limit on the maximum number of reserves
- $w_j$: Conservation weight for species $j$ based on IUCN Red List status:
  - Critically Endangered (CR): $5$
  - Endangered (EN): $4$
  - Vulnerable (VU): $3$
  - Near Threatened (NT): $2$
  - Least Concern (LC) / Data Deficient (DD): $1$
- $y_j \in \{0, 1\}$: $1$ if species $j$ is covered by at least one selected reserve, $0$ otherwise

$$\max \sum_{j \in J} w_j y_j$$

$$\text{subject to } y_j \le \sum_{i \in I} a_{ij} x_i \quad \forall j \in J$$

$$\sum_{i \in I} x_i \le K$$

$$x_i \in \{0, 1\} \quad \forall i \in I, \quad y_j \in \{0, 1\} \quad \forall j \in J$$

---

## 🚀 Setup & Execution Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- PostgreSQL 15+

---

### 1. Data Cleaning & Gridding Pipeline
Raw GBIF occurrences (`occurrence.txt`) are cleaned for spatial uncertainty ($<10\text{ km}$), filtered to the Western Ghats bounding box ($8^\circ\text{--}21^\circ\text{N}, 73^\circ\text{--}78^\circ\text{E}$), and discretized into $0.1^\circ \times 0.1^\circ$ grid cells.

```bash
python clean_and_grid.py
```
*Outputs:* `cleaned_occurrences.csv` (9,226 records), `grid_cells.csv` (759 cells), `coverage_matrix.csv` (759 × 220 matrix).

---

### 2. Generate IUCN Threat Weights
Fetch real IUCN Red List status and compute species weights ($w_j$). Supports `IUCN_API_KEY` or falls back to GBIF's open IUCN API.

```bash
python solver/fetch_iucn_weights.py
```
*Outputs:* `weights.csv` (220 species categorized across CR, EN, VU, NT, LC, DD).

---

### 3. Run Optimization Tests
Verify solver formulations and data loading.

```bash
pytest solver/ -v
```

---

### 4. Start Solver Microservice
Run the FastAPI optimization service.

```bash
python solver/server.py
```
*Service URL:* `http://localhost:8000` (Endpoints: `/health`, `/solve`, `/coverage-curve`, `/sensitivity`)

---

### 5. Database Setup & Seeding

1. Create `web/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/sahyopt?schema=public"
SOLVER_URL="http://localhost:8000"
```

2. Deploy database migrations and run seed script:
```bash
cd web
npx prisma migrate deploy
npx prisma db seed
```

---

### 6. Run Next.js Dashboard

```bash
cd web
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 📊 Results Summary

1. **Minimum Reserve Network (Set Covering)**:
   - Exactly **57 grid cells** are required to achieve 100% representation (covering all 220 amphibian species at least once).

2. **Coverage vs. Budget Curve (MCLP)**:
   - Budget = 1 cell $\rightarrow$ 19.1% species coverage (42 species)
   - Budget = 10 cells $\rightarrow$ 65.9% species coverage (145 species)
   - Budget = 20 cells $\rightarrow$ 80.0% species coverage (176 species)
   - Budget = 40 cells $\rightarrow$ 92.3% species coverage (203 species)
   - Budget = 55 cells $\rightarrow$ 99.1% species coverage (218 species)
   - Budget = 57 cells $\rightarrow$ 100.0% species coverage (220 species)

3. **Equal-Weighted vs. IUCN-Weighted Tradeoff**:
   - At a budget of 20 reserves, incorporating IUCN Red List weights ($w_j$) changes **5 out of 20 selected cells (25.0% network spatial shift)**.
   - **Equal-weighted model**: achieves 80.0% coverage (176 species).
   - **IUCN-weighted model**: achieves 78.2% coverage (172 species).
   - The weighted model trades a small amount of raw coverage for prioritizing threatened species, ensuring critical habitats are prioritized for endangered endemics such as *Nasikabatrachus sahyadrensis* (Purple Frog) and *Raorchestes resplendens* (Resplendent Bush Frog) over widespread species.
   - Both models now use a deterministic tie-breaking term (see `optimize.py`), so this comparison reproduces identically across platforms and repeated runs.
