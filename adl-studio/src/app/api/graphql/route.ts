import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      data: null,
      errors: [
        { message: 'Mock API has been removed. Please configure a real GraphQL endpoint.' }
      ],
    },
    { status: 501 }
  );
}
