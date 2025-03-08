

import requests
from constants import NEYNAR_API_KEY, SIGNER_UUID, NEYNAR_BASE_URL, OPENAI_API_KEY
import logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger("farcaster_bot")

class FarcasterBot:
    def __init__(self):
        self.api_key = NEYNAR_API_KEY
        self.signer_uuid = SIGNER_UUID
        self.base_url = NEYNAR_BASE_URL
        
        if not self.api_key or not self.signer_uuid:
            raise ValueError("NEYNAR_API_KEY and SIGNER_UUID must be set in .env file")
        
        self.headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "x-api-key": self.api_key
        }

    def post_cast(self, text, parent_hash=None, embeds=None, channel_id=None):
        """
        Post a cast to Farcaster
        
        Args:
            text (str): The text content of the cast
            parent_hash (str, optional): Hash of the parent cast for replies
            embeds (list, optional): List of embed objects
            channel_id (str, optional): Channel ID to post to
        """
        url = f"{self.base_url}/cast"
        
        payload = {
            "signer_uuid": self.signer_uuid,
            "text": text
        }
        
        if parent_hash:
            payload["parent"] = parent_hash
        if embeds:
            payload["embeds"] = embeds
        if channel_id:
            payload["channel_id"] = channel_id

        try:
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error posting cast: {e}")
            raise
