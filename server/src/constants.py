import os

from dotenv import load_dotenv
load_dotenv()

NEYNAR_API_KEY = os.getenv("NEYNAR_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SIGNER_UUID = os.getenv("SIGNER_UUID")
NEYNAR_BASE_URL = "https://api.neynar.com/v2/farcaster"
SONIC_PRIVATE_KEY = os.getenv("SONIC_PRIVATE_KEY")