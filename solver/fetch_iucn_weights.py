import os
import time
import pandas as pd
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))
API_KEY = os.getenv('IUCN_API_KEY')

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
WEIGHTS_FILE = os.path.join(DATA_DIR, 'weights.csv')
COVERAGE_FILE = os.path.join(DATA_DIR, 'coverage_matrix.csv')

def get_weight_from_category(category):
    mapping = {
        'CR': 5, 'EN': 4, 'VU': 3, 'NT': 2, 'LC': 1,
        'DD': 1, 'EX': 6, 'EW': 6
    }
    return mapping.get(category, 1)

def main():
    if not API_KEY:
        print("Error: IUCN API key not found")
        return
        
    coverage = pd.read_csv(COVERAGE_FILE, index_col=0)
    species_list = list(coverage.columns)
    
    existing_data = []
    processed_species = set()
    
    if os.path.exists(WEIGHTS_FILE):
        existing_df = pd.read_csv(WEIGHTS_FILE)
        existing_data = existing_df.to_dict('records')
        processed_species = set(existing_df['species'])
    
    new_data = []
    
    for sp in species_list:
        if sp in processed_species:
            continue
            
        print(f"Fetching data for {sp}...")
        url = f"https://apiv3.iucnredlist.org/api/v3/species/{sp}?token={API_KEY}"
        
        try:
            response = requests.get(url)
            response.raise_for_status()
            data = response.json()
            
            if data and 'result' in data and len(data['result']) > 0:
                category = data['result'][0].get('category', 'NF')
            else:
                category = 'NF'
                
            weight = get_weight_from_category(category)
            
            new_data.append({
                'species': sp,
                'iucn_category': category,
                'weight': weight
            })
            
            time.sleep(1)  # rate limit
            
        except Exception as e:
            print(f"Error fetching {sp}: {e}")
            new_data.append({
                'species': sp,
                'iucn_category': 'NF',
                'weight': 1
            })
            time.sleep(1)

    all_data = existing_data + new_data
    if all_data:
        df = pd.DataFrame(all_data)
        df.to_csv(WEIGHTS_FILE, index=False)
        print(f"Saved {len(df)} weights to {WEIGHTS_FILE}")

if __name__ == '__main__':
    main()
