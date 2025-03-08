from typing import List, Optional
from pydantic import BaseModel, Field

class TimeBasedMultipliers(BaseModel):
    tweet_night_multiplier: float = 0.4
    engagement_day_multiplier: float = 1.5

class FarcasterConfig(BaseModel):
    name: str = "farcaster"
    cast_interval: int = 900
    own_cast_replies_count: int = 2
    timeline_read_count: int = 20
    mention_check_interval: int = 60

class ModelConfig(BaseModel):
    name: Optional[str] = "openai"
    model: Optional[str] = "gpt-3.5-turbo"
    max_tokens: Optional[int] = 1024
    temperature: Optional[float] = 0.7
    network: Optional[str] = "mainnet"

class Task(BaseModel):
    name: str
    weight: float

class AgentConfig(BaseModel):
    name: str
    bio: List[str]
    traits: List[str]
    examples: Optional[List[str]] = Field(default_factory=list)
    example_accounts: Optional[List[str]] = Field(default_factory=list)
    loop_delay: Optional[int] = 60
    use_time_based_weights: Optional[bool] = True
    time_based_multipliers: Optional[TimeBasedMultipliers] = Field(default_factory=TimeBasedMultipliers)
    config: Optional[List[FarcasterConfig | ModelConfig]] = Field(default_factory=lambda: [
        FarcasterConfig(),
        ModelConfig()
    ])
    tasks: List[Task] = [
        Task(name="respond-to-mentions", weight=0.5)
    ]

def convert_zeropy_to_agent_config(zeropy_agent) -> AgentConfig:
    """Convert a ZerePyAgent to AgentConfig"""
    agent = AgentConfig(
        name=zeropy_agent.name,
        bio=zeropy_agent.bio,
        traits=zeropy_agent.traits,
        examples=zeropy_agent.examples,
        example_accounts=zeropy_agent.example_accounts,
        loop_delay=zeropy_agent.loop_delay,
        use_time_based_weights=zeropy_agent.use_time_based_weights,
        time_based_multipliers=TimeBasedMultipliers(
            tweet_night_multiplier=zeropy_agent.time_based_multipliers.get('tweet_night_multiplier', 0.4),
            engagement_day_multiplier=zeropy_agent.time_based_multipliers.get('engagement_day_multiplier', 1.5)
        ),
        config=[FarcasterConfig(**config) for config in zeropy_agent.config],
        tasks=[Task(**task) for task in zeropy_agent.tasks]
    )
    
    # add sonic to the config
    if agent.config is None:
        agent.config = []
    agent.config.append(ModelConfig(name="sonic", network="mainnet", model=None, max_tokens=None, temperature=None))
    return agent
    

class AgentManager:
    _agents: dict = {}
    
    @classmethod
    def add_agent(cls, agent_config: AgentConfig) -> bool:
        """Add a new agent to the manager"""
        if agent_config.name in cls._agents:
            return False
        cls._agents[agent_config.name] = agent_config
        return True
    
    @classmethod
    def get_all_agents(cls) -> List[AgentConfig]:
        """Get all registered agents"""
        return list(cls._agents.values())
    
    @classmethod
    def get_agent(cls, name: str) -> Optional[AgentConfig]:
        """Get a specific agent by name"""
        return cls._agents.get(name)
    
    @classmethod
    def parse_agent_from_cast(cls, cast_text: str) -> Optional[AgentConfig]:
        """
        Parse agent name from cast text. Format: <agent_name>!!
        Example: MemeForge!! Create a meme about web3
        """
        if "!!" not in cast_text:
            return cls.get_agent("MemeForge")  # Default to MemeForge
            
        parts = cast_text.split("!!")
        if not parts:
            return cls.get_agent("MemeForge")
            
        agent_name = parts[0].strip()
        return cls.get_agent(agent_name) or cls.get_agent("MemeForge")
