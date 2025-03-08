import time, threading
from src.action_handler import register_action
from src.helpers import print_h_bar
from src.prompts import POST_CAST_PROMPT, REPLY_CAST_PROMPT


@register_action("post-cast")
def post_cast(agent, **kwargs):
    current_time = time.time()

    if ("last_cast_time" not in agent.state):
        last_cast_time = 0
    else:
        last_cast_time = agent.state["last_cast_time"]

    if current_time - last_cast_time >= agent.cast_interval:
        agent.logger.info("\n📝 GENERATING NEW CAST")
        print_h_bar()

        prompt = POST_CAST_PROMPT.format(agent_name=agent.name)
        cast_text = agent.prompt_llm(prompt)

        if cast_text:
            agent.logger.info("\n🚀 Posting cast:")
            agent.logger.info(f"'{cast_text}'")
            agent.connection_manager.perform_action(
                connection_name="farcaster",
                action_name="post-cast",
                params=[cast_text]
            )
            agent.state["last_cast_time"] = current_time
            agent.logger.info("\n✅ Cast posted successfully!")
            return True
    else:
        agent.logger.info("\n👀 Delaying post until cast interval elapses...")
        return False


@register_action("reply-to-cast")
def reply_to_cast(agent, **kwargs):
    if "timeline_casts" in agent.state and agent.state["timeline_casts"] is not None and len(agent.state["timeline_casts"]) > 0:
        cast = agent.state["timeline_casts"].pop(0)
        cast_hash = cast.get('hash')
        parent_fid = cast.get('author_fid')
        if not cast_hash or not parent_fid:
            return

        agent.logger.info(f"\n💬 GENERATING REPLY to: {cast.get('text', '')[:50]}...")

        base_prompt = REPLY_CAST_PROMPT.format(cast_text=cast.get('text'))
        system_prompt = agent._construct_system_prompt()
        reply_text = agent.prompt_llm(prompt=base_prompt, system_prompt=system_prompt)

        if reply_text:
            agent.logger.info(f"\n🚀 Posting reply: '{reply_text}'")
            agent.connection_manager.perform_action(
                connection_name="farcaster",
                action_name="reply-to-cast",
                params=[parent_fid, cast_hash, reply_text]
            )
            agent.logger.info("✅ Reply posted successfully!")
            return True
    else:
        agent.logger.info("\n👀 No casts found to reply to...")
        return False


@register_action("like-cast")
def like_cast(agent, **kwargs):
    if "timeline_casts" in agent.state and agent.state["timeline_casts"] is not None and len(agent.state["timeline_casts"]) > 0:
        cast = agent.state["timeline_casts"].pop(0)
        cast_hash = cast.get('hash')
        if not cast_hash:
            return False
        
        is_own_cast = cast.get('author_fid') == agent.fid
        if is_own_cast:
            replies = agent.connection_manager.perform_action(
                connection_name="farcaster",
                action_name="get-cast-replies",
                params=[cast_hash]
            )
            if replies:
                agent.state["timeline_casts"].extend(replies[:agent.own_cast_replies_count])
            return True 

        agent.logger.info(f"\n👍 LIKING CAST: {cast.get('text', '')[:50]}...")

        agent.connection_manager.perform_action(
            connection_name="farcaster",
            action_name="like-cast",
            params=[cast_hash]
        )
        agent.logger.info("✅ Cast liked successfully!")
        return True
    else:
        agent.logger.info("\n👀 No casts found to like...")
        return False


@register_action("respond-to-mentions")
def respond_to_mentions(agent, **kwargs):
    """Handle and respond to Farcaster mentions in real-time"""
    if not hasattr(agent, 'fid') or not agent.fid:
        agent.logger.error("No Farcaster FID configured or invalid FID format. Please set FARCASTER_FID in your .env file.")
        return False

    agent.logger.info("\n👂 LISTENING FOR FARCASTER MENTIONS...")
    
    def process_mentions():
        while True:
            try:
                # Get recent mentions
                mentions = agent.connection_manager.perform_action(
                    connection_name="farcaster",
                    action_name="get-mentions",
                    params=[agent.fid]
                )
                
                if not mentions:
                    agent.logger.debug("No new mentions found")
                    time.sleep(60)  # Wait before checking again
                    continue
                
                for mention in mentions:
                    # Skip if we've already processed this mention
                    if "processed_mentions" not in agent.state:
                        agent.state["processed_mentions"] = set()
                    
                    mention_hash = mention.get('hash')
                    if not mention_hash or mention_hash in agent.state["processed_mentions"]:
                        continue
                        
                    mention_text = mention.get('text', '')
                    agent.logger.info(f"\n📨 Received mention: {mention_text}")
                    
                    # Generate and post reply
                    base_prompt = REPLY_CAST_PROMPT.format(cast_text=mention_text)
                    system_prompt = agent._construct_system_prompt()
                    reply_text = agent.prompt_llm(prompt=base_prompt, system_prompt=system_prompt)
                    
                    if reply_text:
                        agent.logger.info(f"\n🚀 Posting reply: '{reply_text}'")
                        agent.connection_manager.perform_action(
                            connection_name="farcaster",
                            action_name="reply-to-cast",
                            params=[mention.get('author_fid'), mention_hash, reply_text]
                        )
                        agent.state["processed_mentions"].add(mention_hash)
                        agent.logger.info("✅ Reply posted successfully!")
                
                time.sleep(60)  # Check for new mentions every minute
                
            except Exception as e:
                agent.logger.error(f"Error processing mentions: {e}")
                time.sleep(60)  # Wait before retrying on error

    # Start mention processing in background thread
    processing_thread = threading.Thread(target=process_mentions)
    processing_thread.daemon = True
    processing_thread.start()
    return True
