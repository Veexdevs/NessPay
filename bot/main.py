from __future__ import annotations

from dotenv import load_dotenv

load_dotenv()

import asyncio
import logging
import sys
import os

import uvicorn

from nesspay import database as db
from nesspay.api import app as api_app
from nesspay.bot import NessPayBot
from nesspay.config import settings


def setup_logging() -> None:
    logging.basicConfig(
        level=getattr(logging, settings.log_level, logging.INFO),
        format="%(asctime)s %(levelname)-8s %(name)s %(message)s",
    )


async def run() -> None:
    await db.connect()
    bot = NessPayBot()
    config = uvicorn.Config(
        api_app,
        host=settings.api_host,
        port=settings.api_port,
        log_level=settings.log_level.lower(),
        access_log=False,
    )
    server = uvicorn.Server(config)
    if not settings.token:
        logging.getLogger("nesspay").warning("DISCORD_TOKEN vazio: apenas a API será iniciada")
        await server.serve()
        return
    try:
        async with bot:
            await asyncio.gather(
                bot.start(settings.token),
                server.serve(),
            )
    finally:
        await db.close()


def main() -> None:
    setup_logging()
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        sys.exit(0)


if __name__ == "__main__":
    main()
