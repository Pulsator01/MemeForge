import logging
import uvicorn
from fastapi import FastAPI, Request, HTTPException
from handlers import handle_webhook
from models import AgentConfig, AgentManager
from src.multi_agent_manager import MultiAgentManager
from fastapi.middleware.cors import CORSMiddleware


# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger("farcaster_bot")

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
        # Validate the agent configuration
        if not agent_config.name:
            raise HTTPException(status_code=400, detail="Agent name is required")
            
        # Try to add the agent to AgentManager
        success = AgentManager.add_agent(agent_config)
        if not success:
            raise HTTPException(status_code=409, detail=f"Agent with name {agent_config.name} already exists")
            
        # Save the agent configuration to the meme_agents file
        try:
            agent_data = {
                "agents": [
                    {
                        "name": agent_config.name,
                        "bio": agent_config.bio,
                        "traits": agent_config.traits,
                        "examples": agent_config.examples,
                        "example_accounts": agent_config.example_accounts,
                        "loop_delay": agent_config.loop_delay,
                        "use_time_based_weights": agent_config.use_time_based_weights,
                        "config": [config.model_dump() for config in agent_config.config] if agent_config.config else [],
                        "tasks": [task.model_dump() for task in agent_config.tasks]
                    }
                ]
            }
            manager = MultiAgentManager()
            loaded_agents = manager.load_agents_from_dict(agent_data)
            logger.info(f"Loaded agents: {loaded_agents}")            
            if not loaded_agents or agent_config.name not in loaded_agents:
                raise Exception("Failed to load newly added agent")
                
            # Set up LLM for the new agent
            new_agent = manager.agents[agent_config.name]
            if not new_agent.is_llm_set:
                new_agent._setup_llm_provider()
                
        except Exception as e:
            # If agent creation fails, remove from AgentManager
            AgentManager._agents.pop(agent_config.name, None)
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
        agents = AgentManager.get_all_agents()
        return {
            "agents": [
                {
                    "name": agent.name,
                    "bio": agent.bio,
                    "traits": agent.traits
                }
                for agent in agents
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Run the FastAPI server
    logger.info("Starting Farcaster bot server on port 3000...")
    uvicorn.run(app, host="0.0.0.0", port=3000)