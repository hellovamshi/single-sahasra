import os
import sys
import logging
from colorama import Fore, Style, init

init(autoreset=True)

class SafeLogFormatter(logging.Formatter):
    """Custom log formatter that colorizes terminal logs and masks sensitive tokens."""
    
    SECRET_KEYS = [
        "EXTRAPE_API_KEY", "EXTRAPE_API_SECRET", "TELEGRAM_API_HASH", 
        "TELEGRAM_BOT_TOKEN", "api_key", "api_secret", "token"
    ]

    def format(self, record):
        log_message = super().format(record)
        # Ensure secrets are never logged
        for key in self.SECRET_KEYS:
            secret_val = os.getenv(key)
            if secret_val and len(secret_val) > 4:
                log_message = log_message.replace(secret_val, "***MASKED***")
        
        # Colorize levels for console output
        if record.levelno == logging.INFO:
            return f"{Fore.GREEN}{log_message}{Style.RESET_ALL}"
        elif record.levelno == logging.WARNING:
            return f"{Fore.YELLOW}{log_message}{Style.RESET_ALL}"
        elif record.levelno == logging.ERROR:
            return f"{Fore.RED}{log_message}{Style.RESET_ALL}"
        elif record.levelno == logging.DEBUG:
            return f"{Fore.CYAN}{log_message}{Style.RESET_ALL}"
        return log_message


def setup_logger(name: str = "SahasraTechEngine", log_level: str = "INFO") -> logging.Logger:
    """Configures system logger with console output and file logging."""
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    if not logger.handlers:
        # Console Handler
        c_handler = logging.StreamHandler(sys.stdout)
        c_format = SafeLogFormatter('%(asctime)s [%(levelname)s] %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
        c_handler.setFormatter(c_format)
        logger.addHandler(c_handler)
        
        # File Handler
        try:
            os.makedirs("logs", exist_ok=True)
            f_handler = logging.FileHandler("logs/engine.log", encoding="utf-8")
            f_format = logging.Formatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s')
            f_handler.setFormatter(f_format)
            logger.addHandler(f_handler)
        except Exception:
            pass

    return logger

logger = setup_logger()
