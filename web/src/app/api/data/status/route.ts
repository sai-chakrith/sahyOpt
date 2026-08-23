import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const speciesCount = await prisma.species.count();
    const cellCount = await prisma.gridCell.count();
    const coverageCount = await prisma.coverage.count();
    const lastRun = await prisma.optimizationRun.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, modelType: true },
    });

    // Count species with IUCN weights loaded
    const weightedSpecies = await prisma.species.count({
      where: { iucnCategory: { not: null } },
    });

    // Compute minReserves dynamically (try cache first, then solver service, fallback to snapshot)
    let minReserves = 57; // Snapshot fallback value
    try {
      const cachedRun = await prisma.optimizationRun.findFirst({
        where: { modelType: 'set_covering' },
        orderBy: { createdAt: 'desc' },
      });
      if (cachedRun) {
        minReserves = cachedRun.totalSelected;
      } else {
        const SOLVER_URL = process.env.SOLVER_URL || 'http://localhost:8000';
        const solverRes = await fetch(`${SOLVER_URL}/solve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'set_covering' }),
          signal: AbortSignal.timeout(5000) // 5s timeout to prevent blocking page load
        });
        if (solverRes.ok) {
          const result = await solverRes.json();
          minReserves = result.totalSelected;
          // Cache in database
          await prisma.optimizationRun.create({
            data: {
              modelType: 'set_covering',
              budget: null,
              weighted: false,
              selectedCells: JSON.stringify(result.selectedCells),
              coveredSpecies: JSON.stringify(result.coveredSpecies),
              coveragePercent: result.coveragePercent,
              totalSelected: result.totalSelected,
              solveTimeMs: result.solveTimeMs,
            },
          });
        }
      }
    } catch (err) {
      console.warn('Could not compute dynamic minReserves, using fallback:', err);
    }

    return NextResponse.json({
      speciesCount,
      cellCount,
      coverageCount,
      weightsLoaded: weightedSpecies > 0,
      weightedSpeciesCount: weightedSpecies,
      lastOptimizationRun: lastRun,
      recordCount: 9226, // from validated pipeline
      minReserves, // dynamically loaded set-covering minimum
    });
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data status' },
      { status: 500 }
    );
  }
}
