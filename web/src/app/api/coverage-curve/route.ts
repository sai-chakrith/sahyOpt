import { NextRequest, NextResponse } from 'next/server';

const SOLVER_URL = process.env.SOLVER_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weighted = searchParams.get('weighted') === 'true';
    const maxBudget = parseInt(searchParams.get('max_budget') || '70');

    const response = await fetch(
      `${SOLVER_URL}/coverage-curve?weighted=${weighted}&max_budget=${maxBudget}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Solver error: ${errorText}` },
        { status: 502 }
      );
    }

    const curve = await response.json();
    return NextResponse.json(curve);
  } catch (error) {
    console.error('Coverage curve API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate coverage curve. Is the solver running?' },
      { status: 500 }
    );
  }
}
