import os
import sys
import asyncio
import argparse
import random
from datetime import datetime
from dotenv import load_dotenv
from telethon import TelegramClient, events

# Load environment variables
load_dotenv()

from database.db_manager import DatabaseManager
from core.url_processor import URLProcessor
from affiliates.manager import AffiliateManager
from core.classifier import DealClassifier
from core.extractor import InformationExtractor
from core.filter import DealFilter
from utils.text_formatter import TextFormatter
from publishers.telegram_pub import TelegramPublisher
from core.models import Deal, MediaItem
from utils.logger import logger, setup_logger
import http.server
import socketserver
import threading

logger = setup_logger("SahasraTechEngine")


def start_dummy_health_check_server():
    """Starts background HTTP server for Render Free Web Service health check."""
    port_str = os.getenv("PORT", "10000")
    try:
        port = int(port_str)
        class HealthHandler(http.server.SimpleHTTPRequestHandler):
            def do_GET(self):
                self.send_response(200)
                self.send_header("Content-type", "text/plain")
                self.end_headers()
                self.wfile.write(b"Sahasra Tech Engine Running 24/7")
            def log_message(self, format, *args):
                pass
        
        server = socketserver.TCPServer(("0.0.0.0", port), HealthHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        logger.info(f"[RENDER] Started HTTP health check server on 0.0.0.0:{port}")
    except Exception as e:
        logger.warning(f"[RENDER] Health check server error: {e}")


# Start HTTP health check server immediately at module load for instant port binding on Render
start_dummy_health_check_server()


class SahasraTechEngine:
    """Main Orchestrator for Sahasra Tech Deal Engine."""

    def __init__(self, use_mock_extrape: bool = False):
        self.db = DatabaseManager()
        self.url_processor = URLProcessor()
        self.affiliate_mgr = AffiliateManager(use_mock_extrape=use_mock_extrape)
        self.classifier = DealClassifier(db_manager=self.db)
        self.extractor = InformationExtractor()
        self.filter = DealFilter()
        self.formatter = TextFormatter()

        self.api_id = int(os.getenv("TELEGRAM_API_ID", 0))
        self.api_hash = os.getenv("TELEGRAM_API_HASH", "")
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.session_name = os.getenv("TELEGRAM_SESSION_NAME", "sahasra_userbot")

        # Channels (10 Monitored Target Channels)
        default_targets = [
            "@iamprasadtech", "@TechFactsDeals", "@tech24deals", "@mspdealsofficial",
            "@trtpremiumdeals", "@TeluguTechworld", "@trtdeals", "@elitedealsx",
            "@extrape", "@telugutipsdeals"
        ]
        source_raw = os.getenv("TELEGRAM_SOURCE_CHANNELS", "")
        parsed = [s.strip() for s in source_raw.split(",") if s.strip()]
        if not parsed:
            self.source_channels = default_targets
        else:
            parsed_set = {ch.lower() for ch in parsed}
            for d in default_targets:
                if d.lower() not in parsed_set:
                    parsed.append(d)
            self.source_channels = parsed
        self.destination_channel = os.getenv("TELEGRAM_DESTINATION_CHANNEL", "@sahasratechdeals")

        self.client = None
        self.bot_client = None
        self.publisher = None
        self.is_paused = False

    async def init_telegram_client(self):
        """Initialize Telethon Client using Userbot account for reading public channels & Bot Client for Admin Commands."""
        if not self.api_id or not self.api_hash:
            logger.error("[SYSTEM] TELEGRAM_API_ID or TELEGRAM_API_HASH missing in .env")
            return False

        # Always use Userbot session to enable reading external public channels
        phone = os.getenv("TELEGRAM_PHONE")
        self.client = TelegramClient(self.session_name, self.api_id, self.api_hash)
        await self.client.start(phone=phone)

        # Initialize Bot Token Client for Telegram Admin Commands
        if self.bot_token:
            try:
                self.bot_client = TelegramClient("sahasra_bot_session", self.api_id, self.api_hash)
                await self.bot_client.start(bot_token=self.bot_token)
                logger.info("[SYSTEM] Telegram Bot Client connected successfully!")
            except Exception as e:
                logger.warning(f"[SYSTEM] Could not start Bot Token Client: {e}")

        self.affiliate_mgr.set_telegram_client(self.client)
        self.publisher = TelegramPublisher(self.client, self.destination_channel)
        logger.info(f"[SYSTEM] Telegram Userbot Client connected successfully!")
        return True

    async def process_incoming_message(self, event):
        """Complete deal processing pipeline."""
        message = event.message
        if not message or not message.text:
            return

        if self.is_paused:
            logger.info("[PIPELINE] Deal Engine is currently PAUSED via Telegram command - message skipped")
            return

        try:
            chat = await event.get_chat()
            source_name = getattr(chat, 'username', None) or str(getattr(chat, 'id', 'unknown'))
        except Exception:
            source_name = str(getattr(event, 'chat_id', 'unknown'))

        logger.info(f"[PIPELINE] New message received from {source_name} (ID: {message.id})")

        # Step 1: Detect URLs
        urls = self.url_processor.extract_urls(message.text)
        urls_found = len(urls) > 0

        # Step 2: Deal Classifier check
        if not self.classifier.is_valid_deal_message(message.text, urls_found=urls_found):
            logger.info("[PIPELINE] Message skipped (Not classified as deal)")
            return

        # Step 3: Select primary product URL
        best_url_info = self.url_processor.process_and_select_best_product_url(urls)
        if not best_url_info:
            logger.warning("[PIPELINE] No valid product URL identified")
            return

        # Step 4: Extract attributes for Duplicate Check
        price = self.extractor.extract_price(message.text)
        mrp = self.extractor.extract_mrp(message.text)
        title = self.extractor.extract_title(message.text)

        # Duplicate Check (URL + Title + Price)
        if self.classifier.is_duplicate(best_url_info.normalized_url, title=title, price=price):
            logger.info(f"[DEDUP] Duplicate deal detected (URL/Title): '{title[:40]}' - Skipped!")
            return

        # Step 5: Convert via Affiliate Manager (Extrape Telegram Bot / API / Amazon Direct / Fallback)
        affiliate_res = await self.affiliate_mgr.convert_url_async(
            best_url_info.expanded_url or best_url_info.original_url, 
            best_url_info.store
        )
        self.db.log_affiliate_result(affiliate_res)

        # Step 6: Extract remaining deal attributes
        discount = self.extractor.extract_discount(message.text, price, mrp)
        coupon = self.extractor.extract_coupon(message.text)
        bank_offers = self.extractor.extract_bank_offers(message.text)
        cashback = self.extractor.extract_cashback(message.text)
        specs = self.extractor.extract_specs(message.text)

        # Step 7: Build Deal Object
        deal = Deal(
            source_channel=source_name,
            message_id=message.id,
            raw_text=message.text,
            title=title,
            price=price,
            mrp=mrp,
            discount=discount,
            coupon_code=coupon,
            bank_offers=bank_offers,
            cashback=cashback,
            specs=specs,
            original_url=best_url_info.original_url,
            normalized_url=best_url_info.normalized_url,
            affiliate_url=affiliate_res.final_url,
            affiliate_provider=affiliate_res.provider,
            store=best_url_info.store,
            affiliate_status="SUCCESS" if affiliate_res.success else "FAILED",
            affiliate_error=affiliate_res.error
        )

        # Step 8: Apply Filter Engine Rules
        valid, reason = self.filter.validate_deal(deal)
        if not valid:
            logger.info(f"[FILTER] Deal rejected by filter engine: {reason}")
            return

        # Step 9: Download original media if present, or scrape product image from link
        media_items = []
        if message.media:
            os.makedirs("media_cache", exist_ok=True)
            file_path = await message.download_media(file="media_cache/")
            if file_path:
                media_items.append(MediaItem(file_path=file_path, media_type="photo"))
                deal.media_items = media_items

        # Fallback Image Scraper: Fetch exact product image from store page if post has no photo
        if not deal.media_items:
            product_url = best_url_info.expanded_url or best_url_info.original_url
            scraped_img_path = self.extractor.fetch_product_image(product_url)
            if scraped_img_path:
                deal.media_items = [MediaItem(file_path=scraped_img_path, media_type="photo")]

        # Step 10: Format Post Text
        formatted_post = self.formatter.format_deal_post(deal)

        # Step 11: Publish as NEW message to Destination Channel
        published = await self.publisher.publish_deal(deal, formatted_post)

        # Step 12: Save Deal Record to SQLite and wait 5s before next post
        if published:
            deal_id = self.db.save_deal(deal)
            logger.info(f"[SUCCESS] Deal #{deal_id} processed & published successfully to {self.destination_channel}!")
            
            # 5 Second Gap between deal posts
            delay = 5
            logger.info(f"[DELAY] Pausing {delay} seconds before processing next deal post...")
            await asyncio.sleep(delay)

    def generate_daily_report_text(self) -> str:
        """Generates End-of-Day summary report broken down by e-commerce platform."""
        today_str = datetime.now().strftime('%d %b %Y')
        store_stats = self.db.get_store_breakdown_today()
        aff_stats = self.db.get_affiliate_statistics()
        
        status_text = "🟢 LIVE & ACTIVE" if not self.is_paused else "🔴 PAUSED"
        
        store_icons = {
            "amazon": "🛒 Amazon",
            "flipkart": "🛍️ Flipkart",
            "myntra": "👗 Myntra",
            "ajio": "👟 Ajio",
            "croma": "🔌 Croma",
            "tatacliq": "🛍️ Tata CLiQ",
            "reliancedigital": "📱 Reliance Digital",
            "extrape_deal": "⚡ Extrape Deal Link"
        }
        
        store_lines = []
        total_posted = 0
        for store, count in store_stats.items():
            total_posted += count
            name = store_icons.get(store.lower(), f"📦 {store.capitalize()}")
            store_lines.append(f"• **{name}:** {count} deals")
            
        if not store_lines:
            store_lines.append("• *No deals posted yet today*")

        report = (
            f"🌙 **Sahasra Tech Deals — Daily End-of-Day Report**\n"
            f"📅 **Date:** {today_str}\n\n"
            f"📊 **Today's Posted Deals by Platform:**\n" +
            "\n".join(store_lines) +
            f"\n\n📈 **Summary Statistics:**\n"
            f"• **Total Deals Posted Today:** {total_posted}\n"
            f"• **Extrape Conversions:** {aff_stats['extrape_conversions']}\n"
            f"• **Amazon Direct Tag:** {aff_stats['amazon_direct']}\n"
            f"• **System Status:** {status_text}\n\n"
            "⚡ *Sahasra Tech Deals Engine*"
        )
        return report

    async def register_handlers_and_run(self):
        """Start Telegram message listener and admin bot handler."""
        if not await self.init_telegram_client():
            return

        print(f"\n⚡ Sahasra Tech Deal Engine IS LIVE!")
        print(f"📡 Monitoring {len(self.source_channels)} Source Channels")
        print(f"📢 Publishing to {self.destination_channel}\n")

        # Register Admin Control Handlers on BOTH Userbot and Bot Token Client
        clients_to_register = [c for c in [self.client, self.bot_client] if c is not None]

        for client_instance in clients_to_register:
            @client_instance.on(events.NewMessage(pattern=r'/(pause|bot_off|off)'))
            async def admin_pause_handler(event):
                self.is_paused = True
                logger.info("[ADMIN] Deal Engine PAUSED via Telegram command")
                await event.reply(
                    "⏸️ **Sahasra Tech Deal Engine is PAUSED!**\n\n"
                    "Posting is temporarily stopped. Send `/resume` or `/on` to start posting deals again.",
                    parse_mode='markdown'
                )

            @client_instance.on(events.NewMessage(pattern=r'/(resume|bot_on|on)'))
            async def admin_resume_handler(event):
                self.is_paused = False
                logger.info("[ADMIN] Deal Engine RESUMED via Telegram command")
                await event.reply(
                    "▶️ **Sahasra Tech Deal Engine is LIVE & ACTIVE!**\n\n"
                    "Real-time deal scraping and posting resumed successfully.",
                    parse_mode='markdown'
                )

            @client_instance.on(events.NewMessage(pattern=r'/(status|help|start)'))
            async def admin_status_command_handler(event):
                status_text = "🟢 **LIVE & ACTIVE**" if not self.is_paused else "🔴 **PAUSED**"
                stats = self.db.get_affiliate_statistics()
                report = (
                    "⚡ **Sahasra Tech Deal Engine Control Panel**\n\n"
                    f"**Current Status:** {status_text}\n"
                    f"**Monitored Channels:** {len(self.source_channels)}\n"
                    f"**Destination Channel:** {self.destination_channel}\n\n"
                    "**Today's Post Stats:**\n"
                    f"• Total Processed: {stats['today_total']}\n"
                    f"• Extrape Conversions: {stats['extrape_conversions']}\n"
                    f"• Amazon Tag Direct: {stats['amazon_direct']}\n\n"
                    "**Telegram Commands:**\n"
                    "• `/pause` or `/off` — Stop deal posting\n"
                    "• `/resume` or `/on` — Start deal posting\n"
                    "• `/status` — View current bot status\n"
                    "• `/report` or `/daily_report` — End-of-Day Store Summary"
                )
                await event.reply(report, parse_mode='markdown')

            @client_instance.on(events.NewMessage(pattern=r'/(report|daily_report|eod)'))
            async def admin_report_command_handler(event):
                report_text = self.generate_daily_report_text()
                await event.reply(report_text, parse_mode='markdown')

        # Real-time Deal Listener for Source Channels (Instant registration!)
        if self.source_channels:
            logger.info(f"[LISTENER] Registering {len(self.source_channels)} active source channels: {self.source_channels}")

            @self.client.on(events.NewMessage(chats=self.source_channels))
            async def deal_message_handler(event):
                await self.process_incoming_message(event)

        # Automated End-of-Day Daily Summary Report Scheduler (Runs at 23:59 IST every night)
        async def end_of_day_scheduler():
            while True:
                now = datetime.now()
                if now.hour == 23 and now.minute == 59:
                    report_text = self.generate_daily_report_text()
                    logger.info("[REPORT] Automated End-of-Day Summary Report sending to channel...")
                    try:
                        await self.publisher.publish_deal(None, report_text)
                    except Exception as e:
                        logger.warning(f"[REPORT] Automated report publish error: {e}")
                    await asyncio.sleep(70)
                await asyncio.sleep(30)

        asyncio.create_task(end_of_day_scheduler())

        logger.info("[SYSTEM] All handlers registered successfully! Entering real-time listening loop.")

        if self.bot_client:
            await asyncio.gather(
                self.client.run_until_disconnected(),
                self.bot_client.run_until_disconnected()
            )
        else:
            await self.client.run_until_disconnected()

    async def send_test_deal_post(self):
        """Sends a sample test deal to destination channel to verify setup."""
        if not await self.init_telegram_client():
            return

        test_deal = Deal(
            source_channel="SahasraTechEngine",
            message_id=999,
            raw_text="Test Deal Post",
            title="Apple iPhone 15 (128 GB) - Black",
            price=65999.0,
            mrp=79900.0,
            discount=17.0,
            coupon_code="IPHONE1000",
            bank_offers="10% Instant Discount on HDFC Card",
            original_url="https://www.amazon.in/dp/B0CHX1W1XY",
            normalized_url="https://www.amazon.in/dp/B0CHX1W1XY",
            affiliate_url="https://www.amazon.in/dp/B0CHX1W1XY?tag=shithistore-21",
            store="amazon",
            affiliate_status="SUCCESS"
        )
        formatted = self.formatter.format_deal_post(test_deal)
        published = await self.publisher.publish_deal(test_deal, formatted)
        if published:
            print(f"\n[SUCCESS] TEST POST SENT SUCCESSFULLY TO {self.destination_channel}!")
        else:
            print(f"\n[ERROR] COULD NOT POST TO {self.destination_channel}. Check if bot is Admin in channel.")


def main():
    parser = argparse.ArgumentParser(description="Sahasra Tech Deal Engine CLI")
    parser.add_argument("--run", action="store_true", help="Start live listener directly")
    parser.add_argument("--test-post", action="store_true", help="Send a test deal post to destination channel")
    parser.add_argument("--mock-extrape", action="store_true", help="Use Extrape Mock Mode for testing")
    args = parser.parse_args()

    if args.test_post:
        engine = SahasraTechEngine(use_mock_extrape=args.mock_extrape)
        asyncio.run(engine.send_test_deal_post())
    elif args.run:
        engine = SahasraTechEngine(use_mock_extrape=args.mock_extrape)
        asyncio.run(engine.register_handlers_and_run())
    else:
        # Interactive Beginner Menu
        while True:
            print("\n" + "=" * 50)
            print("   SAHASRA TECH DEAL ENGINE - MAIN MENU")
            print("=" * 50)
            print("1. 🚀 Start Live Deal Listener (100% Real-Time)")
            print("2. 🧪 Send Test Deal Post to Your Channel")
            print("3. ⚙️ Run Setup Wizard")
            print("4. 📊 View Affiliate Conversion Stats")
            print("5. ❌ Exit")
            
            choice = input("\nEnter choice (1-5): ").strip()

            if choice == '1':
                engine = SahasraTechEngine(use_mock_extrape=args.mock_extrape)
                asyncio.run(engine.register_handlers_and_run())
            elif choice == '2':
                engine = SahasraTechEngine(use_mock_extrape=args.mock_extrape)
                asyncio.run(engine.send_test_deal_post())
            elif choice == '3':
                from setup import run_setup
                run_setup()
            elif choice == '4':
                db = DatabaseManager()
                stats = db.get_affiliate_statistics()
                print("\n📊 TODAY'S AFFILIATE CONVERSION STATISTICS:")
                print(f"  • Total URLs Processed: {stats['today_total']}")
                print(f"  • Extrape Conversions: {stats['extrape_conversions']}")
                print(f"  • Amazon Direct Tag: {stats['amazon_direct']}")
                print(f"  • Fallback URLs: {stats['fallback_urls']}")
                print(f"  • Failed Conversions: {stats['failed_conversions']}")
            elif choice == '5':
                print("Goodbye!")
                break
            else:
                print("Invalid option. Please enter 1-5.")


if __name__ == '__main__':
    main()
