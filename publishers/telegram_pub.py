import os
import asyncio
from typing import Dict, Any, Optional, List
from telethon import TelegramClient, events, Button
from publishers.base import Publisher
from core.models import Deal
from utils.logger import logger


class TelegramPublisher(Publisher):
    """Telegram Destination Channel Publisher using Telethon."""

    def __init__(
        self,
        client: TelegramClient,
        destination_channel: Optional[str] = None
    ):
        self.client = client
        self.destination = destination_channel or os.getenv("TELEGRAM_DESTINATION_CHANNEL", "")

    async def publish_deal(self, deal: Deal, formatted_text: str) -> bool:
        if not self.destination:
            logger.error("[PUBLISHER] Destination channel not configured!")
            return False

        try:
            # Check media items
            media_files = [m.file_path for m in deal.media_items if os.path.exists(m.file_path)] if (deal and deal.media_items) else []

            if not media_files:
                # Text-only post (link_preview disabled as requested)
                logger.info(f"[PUBLISHER] Posting text deal to {self.destination}")
                await self.client.send_message(
                    self.destination,
                    formatted_text,
                    parse_mode='markdown',
                    link_preview=False
                )
            elif len(media_files) == 1:
                # Single Media post with photo/video
                logger.info(f"[PUBLISHER] Posting single media deal to {self.destination}")
                await self.client.send_file(
                    self.destination,
                    file=media_files[0],
                    caption=formatted_text,
                    parse_mode='markdown'
                )
            else:
                # Media Group / Album post
                logger.info(f"[PUBLISHER] Posting album deal ({len(media_files)} files) to {self.destination}")
                await self.client.send_file(
                    self.destination,
                    file=media_files,
                    caption=formatted_text,
                    parse_mode='markdown'
                )

            logger.info(f"[PUBLISHER] Deal published successfully as NEW message!")
            return True

        except Exception as e:
            logger.error(f"[PUBLISHER] Failed to publish deal to Telegram: {e}")
            return False

    def get_status(self) -> Dict[str, Any]:
        return {
            "name": "Telegram Publisher",
            "destination_channel": self.destination,
            "connected": self.client.is_connected() if self.client else False,
            "status": "READY" if self.destination else "MISSING_DESTINATION"
        }
