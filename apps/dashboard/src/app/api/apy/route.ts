import { NextResponse } from 'next/server';

const YIELDS_BACKEND_URL = process.env.NEXT_PUBLIC_YIELDS_BACKEND_URL || 'http://localhost:3001';

export async function GET() {
  try {
    const response = await fetch(`${YIELDS_BACKEND_URL}/api/apy`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error fetching APY data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch APY data' },
      { status: 500 }
    );
  }
}
