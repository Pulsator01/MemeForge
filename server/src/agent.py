import json
import random
import time
import logging
import os
from pathlib import Path
from dotenv import load_dotenv
from src.connection_manager import ConnectionManager
from src.helpers import print_h_bar
from src.action_handler import execute_action
import src.actions.twitter_actions  
import src.actions.echochamber_actions
import src.actions.solana_actions
import src.actions.faracaster_actions
from datetime import datetime
import traceback
REQUIRED_FIELDS = ["name", "bio", "traits", "examples", "loop_delay", "config", "tasks"]

logger = logging.getLogger("agent")

class ZerePyAgent:
    def __init__(
            self,
            agent_name: str
    ):
        try:
            agent_path = Path("agents") / f"{agent_name}.json"
            agent_dict = json.load(open(agent_path, "r"))

            missing_fields = [field for field in REQUIRED_FIELDS if field not in agent_dict]
            if missing_fields:
                raise KeyError(f"Missing required fields: {', '.join(missing_fields)}")

            # Load environment variables first
            load_dotenv()
            
            # Initialize basic attributes
            self.config = agent_dict["config"]
            self.name = agent_dict["name"]
            self.bio = agent_dict["bio"]
            self.traits = agent_dict["traits"]
            self.examples = agent_dict["examples"]
            self.example_accounts = agent_dict["example_accounts"]
            self.loop_delay = agent_dict["loop_delay"]
            self.use_time_based_weights = agent_dict["use_time_based_weights"]
            self.time_based_multipliers = agent_dict["time_based_multipliers"]
            
            # Initialize platform-specific attributes
            self.fid = None
            self.username = None
            self.cast_interval = 900
            self.own_cast_replies_count = 2
            self.tweet_interval = 900
            self.own_tweet_replies_count = 2
            
            # Set up tasks first to check what features we need
            self.tasks = agent_dict.get("tasks", [])
            self.task_weights = [task.get("weight", 0) for task in self.tasks]
            
            has_twitter_tasks = any("tweet" in task["name"] for task in self.tasks)
            has_farcaster_tasks = any("cast" in task["name"] for task in self.tasks)
            
            # Load platform configurations
            twitter_config = next((config for config in agent_dict["config"] if config["name"] == "twitter"), None)
            farcaster_config = next((config for config in agent_dict["config"] if config["name"] == "farcaster"), None)
            # Set up Farcaster configuration if needed
            if has_farcaster_tasks:
                if farcaster_config:
                    self.cast_interval = farcaster_config.get("cast_interval", 900)
                    self.own_cast_replies_count = farcaster_config.get("own_cast_replies_count", 2)
                
                # Load Farcaster FID
                fid = os.getenv('FARCASTER_FID')
                if not fid:
                    logger.warning("Farcaster FID not found in environment, some Farcaster functionalities may be limited")
                else:
                    try:
                        self.fid = int(fid)
                    except ValueError:
                        logger.error("Invalid Farcaster FID format - must be an integer")
                        self.fid = None
            
            # Set up Twitter configuration if needed
            if has_twitter_tasks:
                if twitter_config:
                    self.tweet_interval = twitter_config.get("tweet_interval", 900)
                    self.own_tweet_replies_count = twitter_config.get("own_tweet_replies_count", 2)
                self.username = os.getenv('TWITTER_USERNAME', '').lower()
                if not self.username:
                    logger.warning("Twitter username not found, some Twitter functionalities may be limited")

            # Initialize connection manager after setting up platform configs
            self.connection_manager = ConnectionManager(agent_dict["config"])

            # Extract Echochambers config
            echochambers_config = next((config for config in agent_dict["config"] if config["name"] == "echochambers"), None)
            if echochambers_config:
                self.echochambers_message_interval = echochambers_config.get("message_interval", 60)
                self.echochambers_history_count = echochambers_config.get("history_read_count", 50)

            self.is_llm_set = False
            self._system_prompt = None
            self.logger = logging.getLogger("agent")
            self.state = {}

        except Exception as e:
            logger.error(f"Could not load ZerePy agent: {str(e)}")
            logger.error(traceback.format_exc())
            raise e

    def _setup_llm_provider(self):
        # Get first available LLM provider and its model
        llm_providers = self.connection_manager.get_model_providers()
        if not llm_providers:
            raise ValueError("No configured LLM provider found")
        self.model_provider = llm_providers[0]

        # Load Twitter username for self-reply detection if Twitter tasks exist
        if any("tweet" in task["name"] for task in self.tasks):
            load_dotenv()
            self.username = os.getenv('TWITTER_USERNAME', '').lower()
            if not self.username:
                logger.warning("Twitter username not found, some Twitter functionalities may be limited")

        # Load Farcaster FID for self-reply detection if Farcaster tasks exist
        if any("cast" in task["name"] for task in self.tasks):
            load_dotenv()
            self.fid = os.getenv('FARCASTER_FID')
            if not self.fid:
                logger.warning("Farcaster FID not found, some Farcaster functionalities may be limited")

    def _construct_system_prompt(self) -> str:
        """Construct the system prompt from agent configuration"""
        if self._system_prompt is None:
            prompt_parts = []
            prompt_parts.extend(self.bio)

            if self.traits:
                prompt_parts.append("\nYour key traits are:")
                prompt_parts.extend(f"- {trait}" for trait in self.traits)

            if self.examples or self.example_accounts:
                prompt_parts.append("\nHere are some examples of your style (Please avoid repeating any of these):")
                if self.examples:
                    prompt_parts.extend(f"- {example}" for example in self.examples)

                if self.example_accounts:
                    for example_account in self.example_accounts:
                        logger.info(f"🔍 Getting latest tweets for {example_account}")
                        tweets = self.connection_manager.perform_action(
                            connection_name="twitter",
                            action_name="get-latest-tweets",
                            params=[example_account]
                        )
                        if tweets:
                            prompt_parts.extend(f"- {tweet['text']}" for tweet in tweets)
                            
                        # checking warpcast if no tweets are found
                        # TODO: warpcast fetching casts is a pain in ass, ignore for now
                        # if not tweets:
                        #     logger.info(f"🔍 Getting latest casts for {example_account}")
                        #     try:
                        #         casts = self.connection_manager.perform_action(
                        #             connection_name="farcaster",
                        #             action_name="get-latest-casts",
                        #             params=[self.fid]  # Ensure proper string/int params
                        #         )
                        #         if casts:
                        #             prompt_parts.extend(f"- {cast['text']}" for cast in casts)
                        #     except Exception as e:
                        #         logger.error(f"Failed to get casts: {e}")

            self._system_prompt = "\n".join(prompt_parts)

        return self._system_prompt
    
    def _adjust_weights_for_time(self, current_hour: int, task_weights: list) -> list:
        weights = task_weights.copy()
        
        # Reduce tweet frequency during night hours (1 AM - 5 AM)
        if 1 <= current_hour <= 5:
            weights = [
                weight * self.time_based_multipliers.get("tweet_night_multiplier", 0.4) if task["name"] == "post-tweet"
                else weight
                for weight, task in zip(weights, self.tasks)
            ]
            
        # Increase engagement frequency during day hours (8 AM - 8 PM) (peak hours?🤔)
        if 8 <= current_hour <= 20:
            weights = [
                weight * self.time_based_multipliers.get("engagement_day_multiplier", 1.5) if task["name"] in ("reply-to-tweet", "like-tweet")
                else weight
                for weight, task in zip(weights, self.tasks)
            ]
        
        return weights

    def prompt_llm(self, prompt: str, system_prompt: str | None = None) -> str | None:
        """Generate text using the configured LLM provider"""
        system_prompt = system_prompt or self._construct_system_prompt()
        if not system_prompt:
            return None

        result = self.connection_manager.perform_action(
            connection_name=self.model_provider,
            action_name="generate-text",
            params=[prompt, system_prompt]
        )
        return str(result) if result is not None else None

    def perform_action(self, connection: str, action: str, **kwargs) -> None:
        return self.connection_manager.perform_action(connection, action, **kwargs)
    
    def select_action(self, use_time_based_weights: bool = False) -> dict:
        task_weights = [weight for weight in self.task_weights.copy()]
        
        if use_time_based_weights:
            current_hour = datetime.now().hour
            task_weights = self._adjust_weights_for_time(current_hour, task_weights)
        
        return random.choices(self.tasks, weights=task_weights, k=1)[0]

    def loop(self):
        """Main agent loop for autonomous behavior"""
        if not self.is_llm_set:
            self._setup_llm_provider()

        logger.info("\n🚀 Starting agent loop...")
        logger.info("Press Ctrl+C at any time to stop the loop.")
        print_h_bar()

        time.sleep(2)
        logger.info("Starting loop in 5 seconds...")
        for i in range(5, 0, -1):
            logger.info(f"{i}...")
            time.sleep(1)

        try:
            while True:
                success = False
                try:
                    # REPLENISH INPUTS
                    # TODO: Add more inputs to complexify agent behavior
                    if "timeline_tweets" not in self.state or self.state["timeline_tweets"] is None or len(self.state["timeline_tweets"]) == 0:
                        if any("tweet" in task["name"] for task in self.tasks):
                            logger.info("\n👀 READING TIMELINE")
                            self.state["timeline_tweets"] = self.connection_manager.perform_action(
                                connection_name="twitter",
                                action_name="read-timeline",
                                params=[]
                            )

                    if "room_info" not in self.state or self.state["room_info"] is None:
                        if any("echochambers" in task["name"] for task in self.tasks):
                            logger.info("\n👀 READING ECHOCHAMBERS ROOM INFO")
                            self.state["room_info"] = self.connection_manager.perform_action(
                                connection_name="echochambers",
                                action_name="get-room-info",
                                params=[]  # Change empty dict to empty list
                            )

                    # CHOOSE AN ACTION
                    # TODO: Add agentic action selection
                    logger.info(f"🔍 Choosing action... out of {self.tasks} tasks")
                    
                    action = self.select_action(use_time_based_weights=self.use_time_based_weights)
                    action_name = action["name"]

                    # PERFORM ACTION
                    success = execute_action(self, action_name)

                    logger.info(f"\n⏳ Waiting {self.loop_delay} seconds before next loop...")
                    print_h_bar()
                    time.sleep(self.loop_delay if success else 60)

                except Exception as e:
                    logger.error(f"\n❌ Error in agent loop iteration: {e}, traceback: {traceback.format_exc()}")
                    logger.info(f"⏳ Waiting {self.loop_delay} seconds before retrying...")
                    time.sleep(self.loop_delay)

        except KeyboardInterrupt:
            logger.info("\n🛑 Agent loop stopped by user.")
            return