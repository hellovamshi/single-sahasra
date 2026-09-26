from abc import ABC, abstractmethod
from typing import Dict, Any
from core.models import Deal


class Publisher(ABC):
    """Abstract Publisher Interface for multi-channel deal distribution."""

    @abstractmethod
    async def publish_deal(self, deal: Deal, formatted_text: str) -> bool:
        """Publish deal message and attached media to destination target."""
        pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Return publisher operational status."""
        pass
