-- CreateTable
CREATE TABLE "species" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "iucn_category" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grid_cells" (
    "id" TEXT NOT NULL,
    "cell_lat" DOUBLE PRECISION NOT NULL,
    "cell_lon" DOUBLE PRECISION NOT NULL,
    "centroid_lat" DOUBLE PRECISION NOT NULL,
    "centroid_lon" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "grid_cells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coverage" (
    "id" SERIAL NOT NULL,
    "cell_id" TEXT NOT NULL,
    "species_id" INTEGER NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "coverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "optimization_runs" (
    "id" SERIAL NOT NULL,
    "model_type" TEXT NOT NULL,
    "budget" INTEGER,
    "weighted" BOOLEAN NOT NULL DEFAULT false,
    "selected_cells" TEXT NOT NULL,
    "covered_species" TEXT NOT NULL,
    "coverage_percent" DOUBLE PRECISION NOT NULL,
    "total_selected" INTEGER NOT NULL,
    "solve_time_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "optimization_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "species_name_key" ON "species"("name");

-- CreateIndex
CREATE INDEX "coverage_cell_id_idx" ON "coverage"("cell_id");

-- CreateIndex
CREATE INDEX "coverage_species_id_idx" ON "coverage"("species_id");

-- CreateIndex
CREATE UNIQUE INDEX "coverage_cell_id_species_id_key" ON "coverage"("cell_id", "species_id");

-- CreateIndex
CREATE INDEX "optimization_runs_model_type_budget_weighted_idx" ON "optimization_runs"("model_type", "budget", "weighted");

-- AddForeignKey
ALTER TABLE "coverage" ADD CONSTRAINT "coverage_cell_id_fkey" FOREIGN KEY ("cell_id") REFERENCES "grid_cells"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage" ADD CONSTRAINT "coverage_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
