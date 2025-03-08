import logging
import uvicorn
from fastapi import FastAPI, Request, HTTPException
from handlers import handle_webhook
from models import AgentConfig, AgentManager
from src.multi_agent_manager import MultiAgentManager
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from typing import Optional, Dict, Any
import os
import json


# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger("farcaster_bot")

# Initialize Supabase client
supabase_url = "https://mxzenkojdhmoilblowos.supabase.co"
# Note: You should set this as an environment variable
supabase_key = os.getenv("SUPABASE_KEY")
supabase: Optional[Client] = None

if supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
        logger.info("Successfully connected to Supabase")
    except Exception as e:
        logger.error(f"Failed to connect to Supabase: {e}")
else:
    logger.error("SUPABASE_KEY environment variable is not set")

async def migrate_existing_agents():
    """Migrate existing agents from meme_agents.json to Supabase"""
    if not supabase:
        logger.error("Cannot migrate agents: Supabase connection not available")
        return

    try:
        # Read existing agents from meme_agents.json
        with open("agents/meme_agents.json", "r") as f:
            existing_agents = json.load(f)

        for agent in existing_agents.get("agents", []):
            # Format agent data for Supabase
            agent_data = {
                "name": agent["name"],
                "config": {
                    "bio": agent["bio"],
                    "traits": agent["traits"],
                    "examples": agent["examples"],
                    "example_accounts": agent["example_accounts"],
                    "loop_delay": agent["loop_delay"],
                    "use_time_based_weights": agent["use_time_based_weights"],
                    "time_based_multipliers": agent.get("time_based_multipliers", {}),
                    "config": agent["config"],
                    "tasks": agent["tasks"]
                }
            }

            # Check if agent already exists
            existing = supabase.table("agents").select("*").eq("name", agent["name"]).execute()
            if not existing.data:
                # Insert new agent
                result = supabase.table("agents").insert(agent_data).execute()
                if result.data:
                    logger.info(f"Successfully migrated agent: {agent['name']}")
                else:
                    logger.error(f"Failed to migrate agent: {agent['name']}")
            else:
                logger.info(f"Agent {agent['name']} already exists in database")

    except Exception as e:
        logger.error(f"Error during agent migration: {e}")

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/")
async def webhook(request: Request):
    """Webhook endpoint to handle incoming Farcaster events"""
    try:
        body = await request.body()
        result = await handle_webhook(body)
        return result
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        return {"error": str(e)}, 500

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/agents")
async def add_agent(agent_config: AgentConfig):
    """Add a new agent to the system"""
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Supabase connection not available")

        # Validate the agent configuration
        if not agent_config.name:
            raise HTTPException(status_code=400, detail="Agent name is required")
            
        # Convert agent config to dictionary for storage
        agent_data = {
            "name": agent_config.name,
            "config": {
                "bio": agent_config.bio,
                "traits": agent_config.traits,
                "examples": agent_config.examples,
                "example_accounts": agent_config.example_accounts,
                "loop_delay": agent_config.loop_delay,
                "use_time_based_weights": agent_config.use_time_based_weights,
                "config": [config.model_dump() for config in agent_config.config] if agent_config.config else [],
                "tasks": [task.model_dump() for task in agent_config.tasks]
            }
        }

        # Check if agent already exists
        existing_agent = supabase.table("agents").select("*").eq("name", agent_config.name).execute()
        if existing_agent.data:
            raise HTTPException(status_code=409, detail=f"Agent with name {agent_config.name} already exists")

        # Store in Supabase
        result = supabase.table("agents").insert(agent_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to store agent in database")

        # Try to add the agent to AgentManager
        success = AgentManager.add_agent(agent_config)
        if not success:
            # Rollback Supabase insert if agent manager fails
            supabase.table("agents").delete().eq("name", agent_config.name).execute()
            raise HTTPException(status_code=500, detail="Failed to initialize agent in manager")

        # Set up agent with MultiAgentManager
        try:
            manager = MultiAgentManager()
            loaded_agents = manager.load_agents_from_dict({"agents": [agent_data["config"]]})
            if not loaded_agents or agent_config.name not in loaded_agents:
                raise Exception("Failed to load newly added agent")
                
            # Set up LLM for the new agent
            new_agent = manager.agents[agent_config.name]
            if not new_agent.is_llm_set:
                new_agent._setup_llm_provider()
                
        except Exception as e:
            # If agent creation fails, clean up
            AgentManager._agents.pop(agent_config.name, None)
            supabase.table("agents").delete().eq("name", agent_config.name).execute()
            raise HTTPException(status_code=500, detail=f"Failed to create agent: {str(e)}")
        
        return {"message": f"Successfully added agent: {agent_config.name}"}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/agents")
async def list_agents():
    """List all available agents"""
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Supabase connection not available")

        # Fetch agents from Supabase
        result = supabase.table("agents").select("*").execute()
        if not result.data:
            return {"agents": []}

        return {
            "agents": [
                {
                    "name": agent["name"],
                    "bio": agent["config"]["bio"],
                    "traits": agent["config"]["traits"]
                }
                for agent in result.data
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    if not supabase_key:
        logger.error("SUPABASE_KEY environment variable is not set")
        exit(1)
    
    # Migrate existing agents
    import asyncio
    asyncio.run(migrate_existing_agents())
    
    # Run the FastAPI server
    logger.info("Starting Farcaster bot server on port 3000...")
    uvicorn.run(app, host="0.0.0.0", port=3000)