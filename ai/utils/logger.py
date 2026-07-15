"""
utils/logger.py — Structured logging configuration using Loguru.
"""
import sys
from loguru import logger


def setup_logger(level: str = "INFO") -> None:
    """Configure loguru for structured, readable output."""
    logger.remove()
    logger.add(
        sys.stdout,
        format=(
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{line}</cyan> — <level>{message}</level>"
        ),
        level=level,
        colorize=True,
    )
    logger.add(
        "logs/ai_service.log",
        rotation="10 MB",
        retention="7 days",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{line} — {message}",
        level="DEBUG",
        enqueue=True,
    )
