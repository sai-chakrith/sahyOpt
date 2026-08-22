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

    return NextResponse.json({
      speciesCount,
      cellCount,
      coverageCount,
      weightsLoaded: weightedSpecies > 0,
      weightedSpeciesCount: weightedSpecies,
      lastOptimizationRun: lastRun,
      recordCount: 9226, // from validated pipeline
    });
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data status' },
      { status: 500 }
    );
  }
}
