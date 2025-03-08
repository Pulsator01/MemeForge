"""
This file contains the prompt templates used for generating content in various tasks.
These templates are formatted strings that will be populated with dynamic data at runtime.
"""

#Twitter prompts
POST_TWEET_PROMPT =  ("Generate an engaging tweet. Don't include any hashtags, links or emojis. Keep it under 280 characters."
                      "The tweets should be pure commentary, do not shill any coins or projects apart from {agent_name}. Do not repeat any of the"
                      "tweets that were given as the examples. Avoid the words AI and crypto.")

REPLY_TWEET_PROMPT = ("Generate a friendly, engaging reply to this tweet: {tweet_text}. Keep it under 280 characters. Don't include any usernames, hashtags, links or emojis. ")


#Echochamber prompts
REPLY_ECHOCHAMBER_PROMPT = ("Context:\n- Current Message: \"{content}\"\n- Sender Username: @{sender_username}\n- Room Topic: {room_topic}\n- Tags: {tags}\n\n"
                            "Task:\nCraft a reply that:\n1. Addresses the message\n2. Aligns with topic/tags\n3. Engages participants\n4. Adds value\n\n"
                            "Guidelines:\n- Reference message points\n- Offer new perspectives\n- Be friendly and respectful\n- Keep it 2-3 sentences\n- {username_prompt}\n\n"
                            "Enhance conversation and encourage engagement\n\nThe reply should feel organic and contribute meaningfully to the conversation.")


POST_ECHOCHAMBER_PROMPT = ("Context:\n- Room Topic: {room_topic}\n- Tags: {tags}\n- Previous Messages:\n{previous_content}\n\n"
                           "Task:\nCreate a concise, engaging message that:\n1. Aligns with the room's topic and tags\n2. Builds upon Previous Messages without repeating them, or repeating greetings, introductions, or sentences.\n"
                           "3. Offers fresh insights or perspectives\n4. Maintains a natural, conversational tone\n5. Keeps length between 2-4 sentences\n\nGuidelines:\n- Be specific and relevant\n- Add value to the ongoing discussion\n- Avoid generic statements\n- Use a friendly but professional tone\n- Include a question or discussion point when appropriate\n\n"
                           "The message should feel organic and contribute meaningfully to the conversation."
                           )

#Farcaster prompts
POST_CAST_PROMPT = ("Generate an engaging and thoughtful cast. Keep it under 320 characters. "
                    "Do not promote any cryptocurrencies or projects except {agent_name}. Do not repeat any "
                    "example casts. Avoid overused terms like AI and crypto. Focus on providing unique insights "
                    "or starting meaningful discussions or talking about memes and fun.")

REPLY_CAST_PROMPT = ("Generate an insightful, fun, memey, and engaging reply to this cast: {cast_text}. Keep it under 320 characters. "
                     "Do not include any usernames, hashtags, links. The reply should add value to the "
                     "conversation while maintaining the tone.")

# Define the prompt template for generating responses
RESPONSE_PROMPT = "Generate a fun, engaging, and memey response to this message from {message}"

# Add this at the top with other constants
SONIC_ACTION_PROMPT = '''You are a helpful assistant that parses Sonic blockchain commands.
Available Sonic commands and their parameters:

1. get-balance:
   - address (optional): Address to check balance for
   - token_address (optional): Token address to check balance for

2. swap:
   - token_in (required): Input token address or symbol
   - token_out (required): Output token address or symbol
   - amount (required): Amount to swap
   - slippage (optional): Max slippage percentage (default 0.5)

3. transfer:
   - to_address (required): Recipient address
   - amount (required): Amount to transfer
   - token_address (optional): Token address (if not provided, transfers native token)

4. get-token-by-ticker:
   - ticker (required): Token ticker symbol to look up

Given the user's command: {command}

Return a JSON object with:
1. action: The matching Sonic action name
2. params: Dictionary of parameters for the action
3. explanation: Brief explanation of what the command will do

Example response:
{{
    "action": "get-balance",
    "params": {{"address": "0x123..."}},
    "explanation": "Getting balance for address 0x123..."
}}'''