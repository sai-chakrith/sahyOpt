"""
SahyOpt — GBIF Occurrence Cleaning & Grid Construction
Western Ghats Amphibian Reserve Site Selection

Run this on the occurrence.txt file from your GBIF "Simple" download.
Outputs three files you'll feed into the optimization models next:
  - cleaned_occurrences.csv : filtered raw records
  - grid_cells.csv          : candidate reserve sites (grid cell centroids)
  - coverage_matrix.csv     : binary species x cell coverage matrix (a_ij)
"""

import pandas as pd

# ---------- CONFIG (tune these) ----------
INPUT_FILE = "occurrence.txt"        # raw GBIF Simple download
GRID_SIZE_DEG = 0.1                  # ~11 km per cell at this latitude
MAX_COORD_UNCERTAINTY_M = 10_000     # drop records with >10km GPS uncertainty
MIN_OCCURRENCES_PER_CELL = 1         # a species needs >=N records in a cell to "count"

# Western Ghats bounding box (rough — tighten later if you want)
LAT_MIN, LAT_MAX = 8.0, 21.0
LON_MIN, LON_MAX = 73.0, 78.0

# ---------- LOAD ----------
df = pd.read_csv(INPUT_FILE, sep="\t", low_memory=False)
print(f"Raw records: {len(df)}")
print(f"Raw species: {df['species'].nunique()}")

# ---------- CLEAN ----------
cols_needed = ["species", "decimalLatitude", "decimalLongitude",
               "coordinateUncertaintyInMeters", "basisOfRecord",
               "eventDate", "occurrenceStatus"]
df = df[[c for c in cols_needed if c in df.columns]].copy()

df = df.dropna(subset=["species", "decimalLatitude", "decimalLongitude"])

if "occurrenceStatus" in df.columns:
    df = df[df["occurrenceStatus"].str.upper() != "ABSENT"]

# high-uncertainty GPS records get dropped; missing-uncertainty records are kept
# (many valid older museum records simply don't report it)
if "coordinateUncertaintyInMeters" in df.columns:
    df = df[(df["coordinateUncertaintyInMeters"].isna()) |
            (df["coordinateUncertaintyInMeters"] <= MAX_COORD_UNCERTAINTY_M)]

# safety net in case a few stragglers slipped past your GBIF location filter
df = df[df["decimalLatitude"].between(LAT_MIN, LAT_MAX) &
        df["decimalLongitude"].between(LON_MIN, LON_MAX)]

df = df.drop_duplicates(subset=["species", "decimalLatitude", "decimalLongitude", "eventDate"])

print(f"Cleaned records: {len(df)}")
print(f"Cleaned species: {df['species'].nunique()}")

# ---------- BUILD GRID ----------
df["cell_lat"] = ((df["decimalLatitude"] // GRID_SIZE_DEG) * GRID_SIZE_DEG).round(4)
df["cell_lon"] = ((df["decimalLongitude"] // GRID_SIZE_DEG) * GRID_SIZE_DEG).round(4)
df["cell_id"] = df["cell_lat"].astype(str) + "_" + df["cell_lon"].astype(str)

print(f"Occupied grid cells: {df['cell_id'].nunique()}")

# ---------- BUILD COVERAGE MATRIX (a_ij) ----------
counts = df.groupby(["cell_id", "species"]).size().reset_index(name="n_occurrences")
counts = counts[counts["n_occurrences"] >= MIN_OCCURRENCES_PER_CELL]

coverage = counts.pivot_table(index="cell_id", columns="species",
                               values="n_occurrences", fill_value=0)
coverage = (coverage > 0).astype(int)

print(f"Coverage matrix shape (cells x species): {coverage.shape}")
print(f"Species with zero cells after noise filter: "
      f"{(coverage.sum(axis=0) == 0).sum()} — consider lowering MIN_OCCURRENCES_PER_CELL if this is high")

# ---------- SAVE ----------
grid_cells = df[["cell_id", "cell_lat", "cell_lon"]].drop_duplicates().reset_index(drop=True)
grid_cells["centroid_lat"] = (grid_cells["cell_lat"] + GRID_SIZE_DEG / 2).round(4)
grid_cells["centroid_lon"] = (grid_cells["cell_lon"] + GRID_SIZE_DEG / 2).round(4)

grid_cells.to_csv("grid_cells.csv", index=False)
coverage.to_csv("coverage_matrix.csv")
df.to_csv("cleaned_occurrences.csv", index=False)

print("\nSaved: cleaned_occurrences.csv, grid_cells.csv, coverage_matrix.csv")
