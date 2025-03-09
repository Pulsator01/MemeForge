/**
 * AI Agent utility for generating memecoin parameters
 */

interface AIGeneratedParams {
  name: string;
  symbol: string;
  initialSupply: string;
  pairedToken: string;
  liquidityMemecoinAmount: string;
  liquidityPairedTokenAmount: string;
}

/**
 * Fetch AI-generated parameters for a memecoin based on a name
 * @param name The base name to generate parameters for
 * @returns Promise containing the AI-generated parameters
 */
export async function generateTokenParameters(name: string): Promise<AIGeneratedParams> {
  try {
    const response = await fetch('/api/generate-params', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to generate parameters');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating parameters:', error);
    throw error;
  }
} 