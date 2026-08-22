import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const DATA_DIR = path.join(__dirname, '..', '..');

function parseCSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h.trim()] = (values[i] || '').trim();
    });
    return record;
  });
}

async function main() {
  console.log('🌿 SahyOpt Database Seeder');
  console.log('========================\n');

  // 1. Seed Species from coverage_matrix.csv columns
  const coveragePath = path.join(DATA_DIR, 'coverage_matrix.csv');
  const coverageContent = fs.readFileSync(coveragePath, 'utf-8');
  const coverageLines = coverageContent.trim().split('\n');
  const headers = coverageLines[0].split(',');
  const speciesNames = headers.slice(1); // Skip 'cell_id' index column

  // Load weights if available
  const weightsPath = path.join(DATA_DIR, 'weights.csv');
  const weightsMap: Record<string, { category: string; weight: number }> = {};
  if (fs.existsSync(weightsPath)) {
    const weights = parseCSV(weightsPath);
    for (const w of weights) {
      weightsMap[w.species] = {
        category: w.iucn_category || 'NF',
        weight: parseFloat(w.weight) || 1.0,
      };
    }
    console.log(`📋 Loaded ${Object.keys(weightsMap).length} species weights`);
  } else {
    console.log('⚠️  No weights.csv found — using equal weights (1.0)');
  }

  // Upsert species
  console.log(`\n🐸 Seeding ${speciesNames.length} species...`);
  const speciesIdMap: Record<string, number> = {};
  for (const name of speciesNames) {
    const w = weightsMap[name] || { category: null, weight: 1.0 };
    const sp = await prisma.species.upsert({
      where: { name },
      update: { iucnCategory: w.category, weight: w.weight },
      create: { name, iucnCategory: w.category, weight: w.weight },
    });
    speciesIdMap[name] = sp.id;
  }
  console.log(`   ✅ ${speciesNames.length} species seeded`);

  // 2. Seed GridCells from grid_cells.csv
  const gridCells = parseCSV(path.join(DATA_DIR, 'grid_cells.csv'));
  console.log(`\n🗺️  Seeding ${gridCells.length} grid cells...`);
  for (const gc of gridCells) {
    await prisma.gridCell.upsert({
      where: { id: gc.cell_id },
      update: {
        cellLat: parseFloat(gc.cell_lat),
        cellLon: parseFloat(gc.cell_lon),
        centroidLat: parseFloat(gc.centroid_lat),
        centroidLon: parseFloat(gc.centroid_lon),
      },
      create: {
        id: gc.cell_id,
        cellLat: parseFloat(gc.cell_lat),
        cellLon: parseFloat(gc.cell_lon),
        centroidLat: parseFloat(gc.centroid_lat),
        centroidLon: parseFloat(gc.centroid_lon),
      },
    });
  }
  console.log(`   ✅ ${gridCells.length} grid cells seeded`);

  // 3. Seed Coverage from coverage_matrix.csv
  console.log(`\n📊 Seeding coverage matrix...`);
  let coverageCount = 0;
  const BATCH_SIZE = 500;
  let batch: { cellId: string; speciesId: number; present: boolean }[] = [];

  // Clear existing coverage
  await prisma.coverage.deleteMany();

  for (let i = 1; i < coverageLines.length; i++) {
    const values = coverageLines[i].split(',');
    const cellId = values[0];

    for (let j = 1; j < values.length; j++) {
      if (parseInt(values[j]) === 1) {
        const speciesName = speciesNames[j - 1];
        const speciesId = speciesIdMap[speciesName];
        if (speciesId) {
          batch.push({ cellId, speciesId, present: true });
          coverageCount++;

          if (batch.length >= BATCH_SIZE) {
            await prisma.coverage.createMany({ data: batch, skipDuplicates: true });
            batch = [];
          }
        }
      }
    }
  }

  if (batch.length > 0) {
    await prisma.coverage.createMany({ data: batch, skipDuplicates: true });
  }
  console.log(`   ✅ ${coverageCount} coverage entries seeded`);

  // Summary
  const speciesCount = await prisma.species.count();
  const cellCount = await prisma.gridCell.count();
  const covCount = await prisma.coverage.count();
  console.log(`\n🎉 Seed complete!`);
  console.log(`   Species: ${speciesCount}`);
  console.log(`   Grid Cells: ${cellCount}`);
  console.log(`   Coverage entries: ${covCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
