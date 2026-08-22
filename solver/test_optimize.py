import pytest
import optimize

def test_load_data():
    cells, species, a, weights = optimize.load_data()
    assert len(cells) == 760
    assert len(species) == 219
    assert len(a) == 760
    assert len(weights) == 219

def test_solve_set_covering():
    cells, species, a, weights = optimize.load_data()
    result = optimize.solve_set_covering(cells, species, a)
    assert result['status'] == 'Optimal'
    assert result['coveragePercent'] == 100.0
    assert result['totalSelected'] > 0
    assert result['totalSelected'] <= len(cells)

def test_solve_mclp():
    cells, species, a, weights = optimize.load_data()
    budget = 10
    result = optimize.solve_mclp(cells, species, a, weights, budget)
    assert result['status'] == 'Optimal'
    assert result['totalSelected'] <= budget
    assert result['coveragePercent'] > 0

def test_coverage_curve():
    cells, species, a, weights = optimize.load_data()
    curve = optimize.generate_coverage_curve(cells, species, a, weights, max_budget=3)
    assert len(curve) <= 3
    if len(curve) > 1:
        assert curve[1]['coveragePercent'] >= curve[0]['coveragePercent']
