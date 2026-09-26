import re
import yaml
from typing import Optional
from core.models import Deal


class TextFormatter:
    """Formats Deal object into beautiful, high-converting Telegram post text."""

    DEFAULT_TEMPLATE = (
        "🔥 **{title}** 🔥\n\n"
        "{price_block}\n"
        "{coupon_block}"
        "{bank_offer_block}"
        "{cashback_block}"
        "{specs_block}\n"
        "🛒 **[BUY NOW ON {store_upper}]({affiliate_url})**\n\n"
        "⚡ *Sahasra Tech Deals - Verified Loot Deal*"
    )

    def __init__(self, config_path: str = "config.yaml"):
        self.template = self.DEFAULT_TEMPLATE
        self._load_config(config_path)

    def _load_config(self, config_path: str):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                cfg = yaml.safe_load(f) or {}
                custom = cfg.get("post_formatting", {}).get("template")
                if custom:
                    self.template = custom
        except Exception:
            pass

    def format_deal_post(self, deal: Deal) -> str:
        """Formats Deal object into clean, high-converting Telegram post text matching reference screenshots."""
        raw_title = deal.title or "Featured Loot Deal"
        # Clean title: strip existing fire emojis or bullet points
        clean_title = re.sub(r'^[🔥\s\.\-*►✔⚡]+', '', raw_title).strip()
        clean_title = re.sub(r'(?i)\b(bot|bot_text|converted\s*by\s*bot)\b', '', clean_title).strip()
        # Remove raw asterisks/underscores that corrupt Telethon Markdown parsing
        clean_title = clean_title.replace('*', '').replace('_', '').replace('`', '').strip()
        if not clean_title:
            clean_title = "Featured Loot Deal"

        blocks = []
        blocks.append(f"🔥🔥 {clean_title}")

        # Price Line matching reference image
        if deal.price and deal.price > 0:
            blocks.append(f"🎁 Deal Price : ₹{deal.price:,.0f}")
        elif deal.mrp and deal.mrp > 0:
            blocks.append(f"🎁 Deal Price : ₹{deal.mrp:,.0f}")

        # Buy Link Line matching reference image
        aff_url = deal.affiliate_url or deal.original_url or ""
        blocks.append(f"Buy Here : {aff_url}")

        # Bank Offers / Coupon Code / Cashback
        if deal.bank_offers:
            clean_bank = re.sub(r'^(?:bank\s*offer\s*:?\s*)', '', deal.bank_offers, flags=re.IGNORECASE).strip()
            clean_bank = clean_bank.replace('*', '').replace('_', '').strip()
            blocks.append(f"💥 Bank Offer : {clean_bank}")

        if deal.coupon_code:
            clean_coupon = re.sub(r'^[⚡\s\.\-*►✔]+', '', deal.coupon_code).strip()
            clean_coupon = clean_coupon.replace('*', '').replace('_', '').strip()
            if not clean_coupon.lower().startswith("apply") and not clean_coupon.lower().startswith("coupon"):
                clean_coupon = f"Apply {clean_coupon}"
            blocks.append(f"⚡⚡ {clean_coupon}")

        if deal.cashback:
            clean_cb = re.sub(r'^(?:cashback\s*:?\s*)', '', deal.cashback, flags=re.IGNORECASE).strip()
            clean_cb = clean_cb.replace('*', '').replace('_', '').strip()
            blocks.append(f"💰 Cashback : {clean_cb}")

        # Only append Sahasra Tech Deals signature if price >= ₹5,000
        if deal.price and deal.price >= 5000:
            blocks.append("")
            blocks.append("⚡ **Sahasra Tech Deals**")

        return "\n".join(blocks).strip()
