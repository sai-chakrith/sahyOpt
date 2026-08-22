from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import optimize
import os

app = FastAPI(title="SahyOpt Solver")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Load data once at startup
cells, species, a, weights_equal = optimize.load_data()
_, _, _, weights_iucn = optimize.load_data('weights.csv')

class SolveRequest(BaseModel):
    model: str  # 'set_covering' or 'mclp'
    budget: Optional[int] = None
    weighted: Optional[bool] = False

@app.get('/health')
def health():
    return {'status': 'ok', 'cells': len(cells), 'species': len(species)}

@app.post('/solve')
def solve(req: SolveRequest):
    w = weights_iucn if req.weighted else weights_equal
    if req.model == 'set_covering':
        return optimize.solve_set_covering(cells, species, a, w)
    elif req.model == 'mclp':
        if req.budget is None:
            raise HTTPException(400, 'budget required for MCLP')
        return optimize.solve_mclp(cells, species, a, w, req.budget)
    raise HTTPException(400, f'Unknown model: {req.model}')

@app.get('/coverage-curve')
def coverage_curve(weighted: bool = False, max_budget: int = 70):
    w = weights_iucn if weighted else weights_equal
    return optimize.generate_coverage_curve(cells, species, a, w, max_budget)

@app.get('/sensitivity')
def sensitivity():
    """Run set covering with different MIN_OCCURRENCES thresholds."""
    import pandas as pd
    import os
    results = []
    for threshold in [1, 2, 3, 5]:
        cov_df = pd.read_csv(os.path.join(optimize.DATA_DIR, 'coverage_matrix.csv'), index_col=0)
        
        occ_path = os.path.join(optimize.DATA_DIR, 'cleaned_occurrences.csv')
        if not os.path.exists(occ_path):
             results.append({'threshold': threshold, 'error': 'cleaned_occurrences.csv not found'})
             continue
             
        # Re-derive counts from cleaned_occurrences
        occ = pd.read_csv(occ_path)
        counts = occ.groupby(['cell_id', 'species']).size().reset_index(name='n')
        counts = counts[counts['n'] >= threshold]
        if len(counts) == 0:
            results.append({'threshold': threshold, 'minReserves': 0, 'speciesCount': 0, 'cellCount': 0})
            continue
            
        cov = counts.pivot_table(index='cell_id', columns='species', values='n', fill_value=0)
        cov = (cov > 0).astype(int)
        
        # Remove species with zero coverage
        cov = cov.loc[:, cov.sum(axis=0) > 0]
        c = list(cov.index)
        s = list(cov.columns)
        a_new = {}
        for cell in c:
            a_new[cell] = {}
            for sp in s:
                a_new[cell][sp] = int(cov.loc[cell, sp])
        try:
            res = optimize.solve_set_covering(c, s, a_new)
            results.append({'threshold': threshold, 'minReserves': res['totalSelected'], 'speciesCount': len(s), 'cellCount': len(c)})
        except Exception as e:
            results.append({'threshold': threshold, 'error': str(e), 'speciesCount': len(s), 'cellCount': len(c)})
    return results
