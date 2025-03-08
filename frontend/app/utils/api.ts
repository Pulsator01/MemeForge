import { Agent } from '@/components/AgentCard';

const API_URL = process.env.API_URL || 'https://memegents-102364148288.us-central1.run.app/';

export async function fetchAgents(): Promise<Agent[]> {
  try {
    const response = await fetch(`${API_URL}agents`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch agents: ${response.status}`);
    }
    
    const data = await response.json();
    return data.agents || [];
  } catch (error) {
    console.error('Error fetching agents:', error);
    return [];
  }
}

export async function fetchAgentDetails(agentName: string): Promise<Agent | null> {
  try {
    const response = await fetch(`${API_URL}agents`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch agent details: ${response.status}`);
    }
    
    const data = await response.json();
    return data.agents.find((agent: Agent) => agent.name === agentName) || null;
  } catch (error) {
    console.error(`Error fetching agent details for ${agentName}:`, error);
    return null;
  }
} 