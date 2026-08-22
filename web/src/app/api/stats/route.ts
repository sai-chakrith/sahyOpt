import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Species richness per cell (top 30)
    const richnessData = await prisma.coverage.groupBy({
      by: ['cellId'],
      _count: { speciesId: true },
      orderBy: { _count: { speciesId: 'desc' } },
      take: 30,
    });

    const richness = richnessData.map((r) => ({
      cellId: r.cellId,
      speciesCount: r._count.speciesId,
    }));

    // IUCN threat category breakdown
    const categoryBreakdown = await prisma.species.groupBy({
      by: ['iucnCategory'],
      _count: { id: true },
    });

    const threatBreakdown = categoryBreakdown.map((c) => ({
      category: c.iucnCategory || 'NE',
      count: c._count.id,
    }));

    // Endemic species (found in ≤2 cells)
    const endemicData = await prisma.coverage.groupBy({
      by: ['speciesId'],
      _count: { cellId: true },
      having: { cellId: { _count: { lte: 2 } } },
    });

    const endemicSpeciesIds = endemicData.map((e) => e.speciesId);
    const endemicSpecies = await prisma.species.findMany({
      where: { id: { in: endemicSpeciesIds } },
      select: { name: true, iucnCategory: true, weight: true },
    });

    // Occurrence density: how many species per cell (histogram data)
    const allRichness = await prisma.coverage.groupBy({
      by: ['cellId'],
      _count: { speciesId: true },
    });

    // Build histogram buckets
    const counts = allRichness.map((r) => r._count.speciesId);
    const buckets = [
      { range: '1-2', count: 0 },
      { range: '3-5', count: 0 },
      { range: '6-10', count: 0 },
      { range: '11-20', count: 0 },
      { range: '21-50', count: 0 },
      { range: '51+', count: 0 },
    ];
    for (const c of counts) {
      if (c <= 2) buckets[0].count++;
      else if (c <= 5) buckets[1].count++;
      else if (c <= 10) buckets[2].count++;
      else if (c <= 20) buckets[3].count++;
      else if (c <= 50) buckets[4].count++;
      else buckets[5].count++;
    }

    // All cells with richness for map
    const cellRichness = allRichness.map((r) => ({
      cellId: r.cellId,
      speciesCount: r._count.speciesId,
    }));

    return NextResponse.json({
      richness,
      threatBreakdown,
      endemicSpecies,
      densityHistogram: buckets,
      cellRichness,
      totalSpecies: await prisma.species.count(),
      totalCells: await prisma.gridCell.count(),
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
