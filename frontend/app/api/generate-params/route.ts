import { NextRequest, NextResponse } from 'next/server';

// Default paired token address from backend/.env
const DEFAULT_PAIRED_TOKEN = '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38'; // PAIRED_TOKEN_ADDRESS from backend/.env

// AI-based parameter generation function
async function generateMemeParams(name: string) {
  try {
    // In a real implementation, this would call your FastAPI backend
    // For now, we'll simulate AI generation with some logic based on the name

    // Derive symbol from name (take first letter of each word, capitalized)
    const words = name.split(/\s+/);
    const symbol = words.map(word => word.charAt(0).toUpperCase()).join('');
    
    // Generate initial supply based on name length (just a demo approach)
    const baseSupply = 1000000;
    const randomFactor = Math.floor(Math.random() * 9) + 1;
    const initialSupply = String(baseSupply * randomFactor);
    
    // Set liquidity amounts (50% of total supply for liquidity in this example)
    const liquidityMemecoinAmount = String(Math.floor(Number(initialSupply) * 0.5));
    
    // Paired token amount (approximately $10k worth of the paired token)
    // In a real scenario, you'd calculate this based on current token price
    const liquidityPairedTokenAmount = "10";
    
    return {
      name,
      symbol,
      initialSupply,
      pairedToken: DEFAULT_PAIRED_TOKEN,
      liquidityMemecoinAmount,
      liquidityPairedTokenAmount
    };
  } catch (error) {
    console.error('Error generating parameters:', error);
    throw new Error('Failed to generate parameters');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name parameter is required' }, 
        { status: 400 }
      );
    }
    
    const params = await generateMemeParams(name);
    
    return NextResponse.json(params);
  } catch (error) {
    console.error('Error in generate-params API:', error);
    return NextResponse.json(
      { error: 'Failed to generate parameters' }, 
      { status: 500 }
    );
  }
} 