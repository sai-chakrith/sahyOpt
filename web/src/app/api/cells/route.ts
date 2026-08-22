import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get all grid cells with their species counts
    const cells = await prisma.gridCell.findMany({
      include: {
        coverages: {
          include: {
            species: {
              select: { name: true, iucnCategory: true },
            },
          },
        },
      },
    });

    const cellData = cells.map((cell) => ({
      cellId: cell.id,
      cellLat: cell.cellLat,
      cellLon: cell.cellLon,
      centroidLat: cell.centroidLat,
      centroidLon: cell.centroidLon,
      speciesCount: cell.coverages.length,
      species: cell.coverages.map((c) => ({
        name: c.species.name,
        iucnCategory: c.species.iucnCategory,
      })),
    }));

    return NextResponse.json(cellData);
  } catch (error) {
    console.error('Cells API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cell data' },
      { status: 500 }
    );
  }
}
