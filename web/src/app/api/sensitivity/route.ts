import { NextResponse } from 'next/server';

const SOLVER_URL = process.env.SOLVER_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const response = await fetch(`${SOLVER_URL}/sensitivity`);

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Solver error: ${errorText}` },
        { status: 502 }
      );
    }

    const results = await response.json();
    return NextResponse.json(results);
  } catch (error) {
    console.error('Sensitivity API error:', error);
    return NextResponse.json(
      { error: 'Failed to run sensitivity analysis. Is the solver running?' },
      { status: 500 }
    );
  }
}
