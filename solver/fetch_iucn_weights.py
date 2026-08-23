import os
import time
import pandas as pd
import requests
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web', '.env'))
API_KEY = os.getenv('IUCN_API_KEY')

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
WEIGHTS_FILE = os.path.join(DATA_DIR, 'weights.csv')
COVERAGE_FILE = os.path.join(DATA_DIR, 'coverage_matrix.csv')

GBIF_CATEGORY_MAP = {
    'CRITICALLY_ENDANGERED': ('CR', 5),
    'ENDANGERED': ('EN', 4),
    'VULNERABLE': ('VU', 3),
    'NEAR_THREATENED': ('NT', 2),
    'LEAST_CONCERN': ('LC', 1),
    'DATA_DEFICIENT': ('DD', 1),
    'EXTINCT': ('EX', 6),
    'EXTINCT_IN_THE_WILD': ('EW', 6)
}

def get_weight_from_category(category):
    mapping = {
        'CR': 5, 'EN': 4, 'VU': 3, 'NT': 2, 'LC': 1,
        'DD': 1, 'EX': 6, 'EW': 6
    }
    return mapping.get(category, 1)

def fetch_species_weight_iucn(sp, session):
    if not API_KEY or API_KEY.startswith('YOUR') or len(API_KEY) < 10:
        return None
    url = f"https://apiv3.iucnredlist.org/api/v3/species/{sp}?token={API_KEY}"
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        res = session.get(url, headers=headers, timeout=3)
        if res.status_code == 200:
            data = res.json()
            if data and 'result' in data and len(data['result']) > 0:
                cat = data['result'][0].get('category', 'LC')
                weight = get_weight_from_category(cat)
                return {'species': sp, 'iucn_category': cat, 'weight': weight}
    except Exception:
        pass
    return None

def fetch_species_weight_gbif(sp, session):
    try:
        r1 = session.get(f'https://api.gbif.org/v1/species/match?name={sp}', timeout=5).json()
        uk = r1.get('usageKey')
        if uk:
            r2 = session.get(f'https://api.gbif.org/v1/species/{uk}/iucnRedListCategory', timeout=5).json()
            raw_cat = r2.get('category', '')
            if raw_cat in GBIF_CATEGORY_MAP:
                cat_code, weight = GBIF_CATEGORY_MAP[raw_cat]
                return {'species': sp, 'iucn_category': cat_code, 'weight': weight}
    except Exception:
        pass
    return {'species': sp, 'iucn_category': 'LC', 'weight': 1}

def fetch_single_species(sp, session):
    result = fetch_species_weight_iucn(sp, session)
    if result is None:
        result = fetch_species_weight_gbif(sp, session)
    return result

def main():
    if not os.path.exists(COVERAGE_FILE):
        print(f"Error: {COVERAGE_FILE} not found", flush=True)
        return

    coverage = pd.read_csv(COVERAGE_FILE, index_col=0)
    species_list = list(coverage.columns)

    print(f"Fetching IUCN weights for {len(species_list)} species...", flush=True)
    session = requests.Session()
    
    with ThreadPoolExecutor(max_workers=25) as executor:
        futures = [executor.submit(fetch_single_species, sp, session) for sp in species_list]
        results = [f.result() for f in futures]

    df = pd.DataFrame(results)
    df.to_csv(WEIGHTS_FILE, index=False)
    print(f"[OK] Saved {len(df)} species weights to {WEIGHTS_FILE}", flush=True)
    print("\nCategory distribution:", flush=True)
    print(df['iucn_category'].value_counts(), flush=True)

if __name__ == '__main__':
    main()
