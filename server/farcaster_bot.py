import json
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException
from src.multi_agent_manager import MultiAgentManager
import uvicorn
from constants import OPENAI_API_KEY
from prompts import SONIC_ACTION_PROMPT, RESPONSE_PROMPT
from models import AgentManager, AgentConfig, convert_zeropy_to_agent_config
from server.farcaster_utils import FarcasterBot
import openai
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger("farcaster_bot")
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# Get persona-based response using ZerePy
manager = MultiAgentManager()
loaded_agents = manager.load_agents_from_file("meme_agents")

if not loaded_agents:
    raise ValueError("No agents were loaded")

# Initialize AgentManager with loaded agents
for agent_name in loaded_agents:
    zeropy_agent = manager.agents[agent_name]
    agent_config = convert_zeropy_to_agent_config(zeropy_agent)
    AgentManager.add_agent(agent_config)
    # list all supported actions
    logger.info(f"Supported actions: {zeropy_agent}")
    # Ensure LLM is set up
    if not zeropy_agent.is_llm_set:
        zeropy_agent._setup_llm_provider()

logger.info(f"Loaded agents: {loaded_agents}")

async def handle_webhook(request_body):
    """Handle incoming webhook requests"""
    try:
        hook_data = json.loads(request_body)
        bot = FarcasterBot()
        cast_text = hook_data["data"]["text"]
        
        # Handle Sonic commands
        if "sonic" in cast_text.lower():
            return await handle_sonic_command(cast_text, hook_data, bot)
            
        # Handle regular agent commands
        return await handle_agent_command(cast_text, hook_data, bot)
        
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        logger.info(f">>> traceback: {traceback.format_exc()}")
        raise

async def handle_sonic_command(cast_text, hook_data, bot):
    """Handle Sonic-specific commands"""
    try:
        # Parse command with GPT
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": SONIC_ACTION_PROMPT.format(command=cast_text)},
                {"role": "user", "content": "Parse this command and return the JSON response"}
            ],
            temperature=0,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if not content:
            return {"error": "Failed to get response from GPT"}
            
        logger.info(f"Sonic response: {content}")
        parsed = json.loads(content)
        action = parsed["action"]
        params = parsed["params"]
        explanation = parsed["explanation"]
        
        # Get action definition and validate parameters
        resolved_agent = AgentManager.parse_agent_from_cast(cast_text)
        if not resolved_agent:
            raise ValueError("No suitable agent found")
            
        agent = manager.agents[resolved_agent.name]
        sonic_connection = agent.connection_manager.connections["sonic"]
        action_def = sonic_connection.actions[action]
        
        # Convert params dict to ordered list
        param_list = []
        for param in action_def.parameters:
            if param.name in params:
                param_list.append(params[param.name])
            elif param.required:
                raise ValueError(f"Missing required parameter: {param.name}")
        
        logger.info(f"Executing action {action} with params: {param_list}")
        
        # Execute action
        result = agent.connection_manager.perform_action(
            connection_name="sonic",
            action_name=action, 
            params=param_list
        )
        
        # Post response
        response_text = f"{explanation}\n\nResult: {str(result) if result else 'Command executed successfully'}"
        bot.post_cast(
            text=response_text,
            parent_hash=hook_data["data"]["hash"]
        )
        
        return {
            "message": "Sonic command executed",
            "action": action,
            "params": params,
            "explanation": explanation,
            "result": str(result) if result else None
        }
        
    except (json.JSONDecodeError, KeyError) as e:
        return {"error": f"Failed to parse command: {str(e)}"}

async def handle_agent_command(cast_text, hook_data, bot):
    """Handle regular agent commands"""
    resolved_agent = AgentManager.parse_agent_from_cast(cast_text)
    if not resolved_agent:
        raise ValueError("No suitable agent found")
    
    logger.info(f"Resolved agent: {resolved_agent}")
    
    # Clean prompt text
    if "!!" in cast_text:
        _, clean_text = cast_text.split("!!", 1)
        cast_text = clean_text.strip()
    
    # Generate response
    prompt = RESPONSE_PROMPT.format(message=cast_text)
    agent = manager.agents[resolved_agent.name]
    response_text = agent.prompt_llm(prompt)
    
    logger.info(f"Response text: {response_text}")
    if not response_text:
        raise ValueError("Failed to generate response")
    
    # Post response
    result = bot.post_cast(
        text=response_text,
        parent_hash=hook_data["data"]["hash"]
    )
    
    return {
        "message": f"Replied to cast with hash: {result['cast']['hash']}", 
        "agent": resolved_agent.name
    }

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
            global manager
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