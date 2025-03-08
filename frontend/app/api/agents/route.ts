import { NextRequest, NextResponse } from 'next/server';

// Get the API URL from environment variables
const API_URL = process.env.API_URL || 'https://memegents-102364148288.us-central1.run.app/';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    
    // Forward the request to the server
    const response = await fetch(`${API_URL}agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    // Get the response data
    const data = await response.json();
    
    // Return the response with the same status code
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { detail: 'Failed to create agent' },
      { status: 500 }
    );
  }
} 