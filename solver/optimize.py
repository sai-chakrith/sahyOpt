import pandas as pd
from pulp import *
import time
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

def load_data(weights_file=None):
    """Load coverage matrix and optionally species weights."""
    coverage = pd.read_csv(os.path.join(DATA_DIR, 'coverage_matrix.csv'), index_col=0)
    cells = list(coverage.index)
    species = list(coverage.columns)
    
    # Build a_ij dict: a_ij[cell][species] = 1 if species present in cell
    a = {}
    for cell in cells:
        a[cell] = {}
        for sp in species:
            a[cell][sp] = int(coverage.loc[cell, sp])
    
    # Load weights
    weights = {sp: 1.0 for sp in species}  # default equal weights
    if weights_file and os.path.exists(os.path.join(DATA_DIR, weights_file)):
        w_df = pd.read_csv(os.path.join(DATA_DIR, weights_file))
        for _, row in w_df.iterrows():
            if row['species'] in weights:
                weights[row['species']] = float(row['weight'])
    
    return cells, species, a, weights

def solve_set_covering(cells, species, a, weights=None):
    start = time.time()
    prob = LpProblem("SetCovering", LpMinimize)
    x = {i: LpVariable(f"x_{i}", cat='Binary') for i in cells}
    
    # Minimize total reserves
    prob += lpSum(x[i] for i in cells)
    
    # Every species must be covered by at least one selected cell
    for j in species:
        prob += lpSum(a[i][j] * x[i] for i in cells if a[i][j] == 1) >= 1, f"cover_{j}"
    
    prob.solve(PULP_CBC_CMD(msg=0))
    
    elapsed = int((time.time() - start) * 1000)
    selected = [i for i in cells if x[i].varValue and x[i].varValue > 0.5]
    
    # Compute which species are covered
    covered = []
    for j in species:
        if any(a[i][j] == 1 for i in selected):
            covered.append(j)
    uncovered = [j for j in species if j not in covered]
    
    return {
        'status': LpStatus[prob.status],
        'model': 'set_covering',
        'totalSelected': len(selected),
        'selectedCells': selected,
        'coveredSpecies': covered,
        'uncoveredSpecies': uncovered,
        'coveragePercent': round(len(covered) / len(species) * 100, 1),
        'solveTimeMs': elapsed
    }

def solve_mclp(cells, species, a, weights, budget):
    start = time.time()
    prob = LpProblem("MCLP", LpMaximize)
    x = {i: LpVariable(f"x_{i}", cat='Binary') for i in cells}
    y = {j: LpVariable(f"y_{j}", cat='Binary') for j in species}
    
    # Maximize weighted species coverage
    prob += lpSum(weights[j] * y[j] for j in species)
    
    # Species can only be covered if at least one cell covering it is selected
    for j in species:
        covering_cells = [i for i in cells if a[i][j] == 1]
        prob += y[j] <= lpSum(x[i] for i in covering_cells), f"link_{j}"
    
    # Budget constraint
    prob += lpSum(x[i] for i in cells) <= budget, "budget"
    
    prob.solve(PULP_CBC_CMD(msg=0))
    
    elapsed = int((time.time() - start) * 1000)
    selected = [i for i in cells if x[i].varValue and x[i].varValue > 0.5]
    covered = [j for j in species if y[j].varValue and y[j].varValue > 0.5]
    uncovered = [j for j in species if j not in covered]
    
    return {
        'status': LpStatus[prob.status],
        'model': 'mclp',
        'budget': budget,
        'totalSelected': len(selected),
        'selectedCells': selected,
        'coveredSpecies': covered,
        'uncoveredSpecies': uncovered,
        'coveragePercent': round(len(covered) / len(species) * 100, 1),
        'solveTimeMs': elapsed
    }

def generate_coverage_curve(cells, species, a, weights, max_budget=None):
    if max_budget is None:
        max_budget = min(len(cells), 100)
    curve = []
    budgets = list(range(1, max_budget + 1))
    for b in budgets:
        result = solve_mclp(cells, species, a, weights, b)
        curve.append({
            'budget': b,
            'coveragePercent': result['coveragePercent'],
            'speciesCovered': len(result['coveredSpecies'])
        })
        if result['coveragePercent'] >= 100.0:
            break
    return curve

if __name__ == '__main__':
    cells, species, a, weights = load_data()
    print(f"Loaded {len(cells)} cells, {len(species)} species")
    
    result = solve_set_covering(cells, species, a)
    print(f"\nSet Covering: {result['totalSelected']} reserves for {result['coveragePercent']}% coverage")
    print(f"Status: {result['status']}, Solve time: {result['solveTimeMs']}ms")
    
    for budget in [1, 10, 20, 40, 55, 57]:
        result = solve_mclp(cells, species, a, weights, budget)
        print(f"MCLP(budget={budget}): {result['coveragePercent']}% coverage ({len(result['coveredSpecies'])} species)")
