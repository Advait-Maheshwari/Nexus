from __future__ import annotations

import asyncio
import logging
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage

from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger("nexus.email")


@dataclass(frozen=True)
class AccountEmail:
    recipient: str
    subject: str
    body: str


async def deliver_account_email(message: AccountEmail) -> bool:
    if settings.email_delivery_mode == "disabled":
        return False
    if settings.email_delivery_mode == "console":
        logger.info(
            "Local account email recipient=%s subject=%s body=%s",
            message.recipient,
            message.subject,
            message.body,
        )
        return True
    try:
        await asyncio.to_thread(_send_smtp, message)
    except (OSError, smtplib.SMTPException) as exc:
        logger.error("Account email delivery failed: %s", type(exc).__name__)
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Account email delivery is temporarily unavailable",
        ) from exc
    return True


def _send_smtp(message: AccountEmail) -> None:
    email = EmailMessage()
    email["From"] = settings.email_from_address
    email["To"] = message.recipient
    email["Subject"] = message.subject
    email.set_content(message.body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as client:
        client.ehlo()
        if settings.smtp_starttls:
            client.starttls(context=ssl.create_default_context())
            client.ehlo()
        if settings.smtp_username:
            client.login(settings.smtp_username, settings.smtp_password or "")
        client.send_message(email)
