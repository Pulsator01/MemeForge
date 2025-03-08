import json
import logging
import openai
from src.constants import OPENAI_API_KEY
from src.prompts import SONIC_ACTION_PROMPT, RESPONSE_PROMPT
from .models import AgentManager
from .farcaster_utils import FarcasterBot
from src.multi_agent_manager import manager
import traceback

# Configure logging
logger = logging.getLogger("farcaster_bot")

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