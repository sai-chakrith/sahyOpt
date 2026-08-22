import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SOLVER_URL = process.env.SOLVER_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, budget, weighted } = body;

    if (!model || !['set_covering', 'mclp'].includes(model)) {
      return NextResponse.json(
        { error: 'Invalid model. Use "set_covering" or "mclp".' },
        { status: 400 }
      );
    }

    if (model === 'mclp' && (budget === undefined || budget === null)) {
      return NextResponse.json(
        { error: 'Budget is required for MCLP model.' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = {
      modelType: model,
      budget: model === 'mclp' ? budget : null,
      weighted: weighted || false,
    };

    const cached = await prisma.optimizationRun.findFirst({
      where: cacheKey,
      orderBy: { createdAt: 'desc' },
    });

    if (cached) {
      return NextResponse.json({
        ...cached,
        selectedCells: JSON.parse(cached.selectedCells),
        coveredSpecies: JSON.parse(cached.coveredSpecies),
        cached: true,
      });
    }

    // Call the Python solver microservice
    const solverResponse = await fetch(`${SOLVER_URL}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, budget, weighted }),
    });

    if (!solverResponse.ok) {
      const errorText = await solverResponse.text();
      console.error('Solver error:', errorText);
      return NextResponse.json(
        { error: `Solver error: ${errorText}` },
        { status: 502 }
      );
    }

    const result = await solverResponse.json();

    // Cache the result
    const run = await prisma.optimizationRun.create({
      data: {
        modelType: model,
        budget: model === 'mclp' ? budget : null,
        weighted: weighted || false,
        selectedCells: JSON.stringify(result.selectedCells),
        coveredSpecies: JSON.stringify(result.coveredSpecies),
        coveragePercent: result.coveragePercent,
        totalSelected: result.totalSelected,
        solveTimeMs: result.solveTimeMs,
      },
    });

    // Enrich with cell coordinates
    const selectedCellDetails = await prisma.gridCell.findMany({
      where: { id: { in: result.selectedCells } },
      include: {
        coverages: {
          include: { species: { select: { name: true, iucnCategory: true } } },
        },
      },
    });

    const cellDetails = selectedCellDetails.map((cell) => ({
      cellId: cell.id,
      centroidLat: cell.centroidLat,
      centroidLon: cell.centroidLon,
      speciesCount: cell.coverages.length,
      species: cell.coverages.map((c) => ({
        name: c.species.name,
        iucnCategory: c.species.iucnCategory,
      })),
    }));

    return NextResponse.json({
      id: run.id,
      model: result.model,
      status: result.status,
      budget: result.budget,
      totalSelected: result.totalSelected,
      selectedCells: result.selectedCells,
      cellDetails,
      coveredSpecies: result.coveredSpecies,
      uncoveredSpecies: result.uncoveredSpecies,
      coveragePercent: result.coveragePercent,
      solveTimeMs: result.solveTimeMs,
      cached: false,
    });
  } catch (error) {
    console.error('Optimize API error:', error);
    return NextResponse.json(
      { error: 'Failed to run optimization. Is the solver running?' },
      { status: 500 }
    );
  }
}
