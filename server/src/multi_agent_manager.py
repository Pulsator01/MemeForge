import json
import logging
import threading
import time
from pathlib import Path
from typing import Dict, List
from src.agent import ZerePyAgent

logger = logging.getLogger("multi_agent_manager")

class MultiAgentManager:
    def __init__(self):
        self.agents: Dict[str, ZerePyAgent] = {}
        self.agent_threads: Dict[str, threading.Thread] = {}
        self.stop_events: Dict[str, threading.Event] = {}
        
    def load_agents_from_file(self, file_path: str) -> List[str]:
        """Load multiple agents from a JSON file containing agent definitions"""
        try:
            agent_path = Path("agents") / f"{file_path}.json"
            with open(agent_path, "r") as f:
                data = json.load(f)
                
            if "agents" not in data:
                raise KeyError("File does not contain an 'agents' array")
                
            loaded_agents = []
            for agent_data in data["agents"]:
                # Create a temporary file for each agent
                temp_agent_path = Path("agents") / f"temp_{agent_data['name'].lower()}.json"
                try:
                    # Write agent data to temporary file
                    with open(temp_agent_path, "w") as f:
                        json.dump(agent_data, f, indent=2)
                    
                    # Load agent from temporary file
                    agent = ZerePyAgent(f"temp_{agent_data['name'].lower()}")
                    self.agents[agent.name] = agent
                    loaded_agents.append(agent.name)
                    
                finally:
                    # Clean up temporary file
                    if temp_agent_path.exists():
                        temp_agent_path.unlink()
                        
            return loaded_agents
            
        except Exception as e:
            logger.error(f"Error loading agents from file: {e}")
            raise e
            
    def start_agent(self, agent_name: str) -> None:
        """Start a single agent's loop in a separate thread"""
        if agent_name not in self.agents:
            raise ValueError(f"Agent {agent_name} not found")
            
        if agent_name in self.agent_threads and self.agent_threads[agent_name].is_alive():
            raise ValueError(f"Agent {agent_name} is already running")
            
        stop_event = threading.Event()
        self.stop_events[agent_name] = stop_event
        
        def agent_loop():
            agent = self.agents[agent_name]
            logger.info(f"\n🚀 Starting agent: {agent_name}")
            
            try:
                while not stop_event.is_set():
                    try:
                        agent.loop()
                    except Exception as e:
                        logger.error(f"Error in agent {agent_name} loop: {e}")
                        if stop_event.wait(timeout=60):  # Wait 1 minute before retrying
                            break
            except Exception as e:
                logger.error(f"Fatal error in agent {agent_name}: {e}")
            finally:
                logger.info(f"\n🛑 Agent {agent_name} stopped")
                
        thread = threading.Thread(target=agent_loop, name=f"agent_{agent_name}")
        self.agent_threads[agent_name] = thread
        thread.start()
        
    def start_all_agents(self) -> None:
        """Start all loaded agents in parallel"""
        for agent_name in self.agents.keys():
            if agent_name not in self.agent_threads or not self.agent_threads[agent_name].is_alive():
                self.start_agent(agent_name)
                
    def stop_agent(self, agent_name: str) -> None:
        """Stop a single agent"""
        if agent_name in self.stop_events:
            self.stop_events[agent_name].set()
            if agent_name in self.agent_threads:
                self.agent_threads[agent_name].join(timeout=5)
                
    def stop_all_agents(self) -> None:
        """Stop all running agents"""
        for agent_name in list(self.agents.keys()):
            self.stop_agent(agent_name)
            
    def get_running_agents(self) -> List[str]:
        """Get list of currently running agents"""
        return [name for name, thread in self.agent_threads.items() if thread.is_alive()]
        
    def get_loaded_agents(self) -> List[str]:
        """Get list of all loaded agents"""
        return list(self.agents.keys()) 