import os
from datetime import datetime, timezone, timedelta
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
from dotenv import load_dotenv
import jwt as pyjwt

load_dotenv()

# ── Base SMTP Config ──────────────────────────────────────────────
# All senders use the same SMTP credentials, but we override the
# "From" header per email type using MessageSchema(headers=...).

conf = ConnectionConfig(
    MAIL_USERNAME=os.environ.get("SMTP_USER", ""),
    MAIL_PASSWORD=os.environ.get("SMTP_PASSWORD", ""),
    MAIL_FROM=os.environ.get("SMTP_FROM_EMAIL", "hello@gitstack.pro"),
    MAIL_PORT=int(os.environ.get("SMTP_PORT", "2525")),
    MAIL_SERVER=os.environ.get("SMTP_HOST", "smtp.mailtrap.io"),
    MAIL_FROM_NAME=os.environ.get("SMTP_FROM_NAME", "GitStack"),
    MAIL_STARTTLS=os.environ.get("SMTP_TLS", "true").lower() == "true",
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    TEMPLATE_FOLDER=None,
)

mail = FastMail(conf)

# ── Sender Addresses ──────────────────────────────────────────────

EMAIL_TOKEN_SECRET = os.environ.get("EMAIL_TOKEN_SECRET", os.environ.get("SMTP_PASSWORD", "dev-secret-change-me"))
SITE_URL = os.environ.get("FRONTEND_URL", "https://gitstack.pro")


def _generate_email_token(email: str) -> str:
    payload = {
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, EMAIL_TOKEN_SECRET, algorithm="HS256")


SENDERS = {
    "hello": {
        "email": os.environ.get("SMTP_FROM_EMAIL", "hello@gitstack.pro"),
        "name": os.environ.get("SMTP_FROM_NAME", "GitStack"),
    },
    "drop": {
        "email": os.environ.get("SMTP_DROP_EMAIL", "drop@gitstack.pro"),
        "name": os.environ.get("SMTP_DROP_NAME", "GitStack Daily Drop"),
    },
    "marketplace": {
        "email": os.environ.get("SMTP_MARKETPLACE_EMAIL", "marketplace@gitstack.pro"),
        "name": os.environ.get("SMTP_MARKETPLACE_NAME", "GitStack Marketplace"),
    },
    "noreply": {
        "email": os.environ.get("SMTP_NOREPLY_EMAIL", "noreply@gitstack.pro"),
        "name": os.environ.get("SMTP_FROM_NAME", "GitStack"),
    },
}

HELP_EMAIL = os.environ.get("SMTP_HELP_EMAIL", "help@gitstack.pro")

# ── Design Tokens (Primary-inbox optimized) ───────────────────────

_CREAM = "#FDF7EB"
_CHARCOAL = "#2A2A2A"
_RED = "#C53B3A"
_GREEN = "#0C9367"
_BLUE = "#09407E"
_YELLOW = "#F1B333"
_ORANGE = "#F07633"
_PURPLE = "#6758A5"
_MUTED = "#6B6560"
_LIGHT = "#F5F0E6"

_FONT_HEADING = "Georgia, 'Times New Roman', serif"
_FONT_BODY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
_FONT_MONO = "'IBM Plex Mono', 'Courier New', monospace"


# ── Shared Helpers ────────────────────────────────────────────────

def _logo_text(badge: str = None) -> str:
    """Text-only logo — no images. Critical for Primary inbox."""
    badge_html = ""
    if badge:
        badge_html = (
            f'<span style="display:inline-block;margin-left:8px;padding:2px 8px;background:{_CHARCOAL};'
            f'color:{_CREAM};font-family:{_FONT_MONO};font-size:9px;font-weight:700;'
            f'text-transform:uppercase;letter-spacing:1px;border-radius:9999px;">{badge}</span>'
        )
    return (
        f'<span style="font-family:{_FONT_HEADING};font-size:22px;font-weight:700;color:{_CHARCOAL};letter-spacing:-1px;">Git</span>'
        f'<span style="font-family:{_FONT_HEADING};font-size:22px;font-weight:700;color:{_RED};letter-spacing:-1px;">Stack</span>'
        f'{badge_html}'
    )


def _hero(title: str, subtitle: str = "", accent: str = _ORANGE) -> str:
    sub = f'<p style="margin:6px 0 0;font-family:{_FONT_BODY};font-size:15px;color:{_MUTED};line-height:1.5;">{subtitle}</p>' if subtitle else ""
    return f"""
    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_HEADING};font-size:22px;font-weight:700;color:{accent};line-height:1.3;">{title}</p>
      {sub}
    </td></tr>
    """


def _divider() -> str:
    return f'<tr><td style="padding:0 0 16px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid {_CHARCOAL};"></td></tr></table></td></tr>'


def _section(title: str, body: str, accent: str = _ORANGE) -> str:
    """Text section with 3px colored left border."""
    return f"""
    <tr><td style="padding:0 0 20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:3px;background:{accent};font-size:0;line-height:0;">&nbsp;</td>
          <td style="padding-left:12px;">
            <p style="margin:0;font-family:{_FONT_HEADING};font-size:17px;font-weight:700;color:{_CHARCOAL};">{title}</p>
            <p style="margin:6px 0 0;font-family:{_FONT_BODY};font-size:15px;color:{_CHARCOAL};line-height:1.6;">{body}</p>
          </td>
        </tr>
      </table>
    </td></tr>
    """


def _link(text: str, url: str, accent: str = _RED) -> str:
    """Text link instead of pill button."""
    return f'<a href="{url}" style="color:{accent};font-family:{_FONT_BODY};font-size:15px;font-weight:600;text-decoration:underline;">{text} →</a>'


def _email_shell(title: str, body: str, prefs_url: str = None, unsub_url: str = None) -> str:
    footer = ""
    if prefs_url and unsub_url:
        footer = f"""
        <tr><td style="padding:16px 0 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-top:1px solid {_CHARCOAL};padding-top:16px;">
              <p style="margin:0;font-family:{_FONT_BODY};font-size:11px;color:{_MUTED};line-height:1.5;">
                <a href="{prefs_url}" style="color:{_MUTED};text-decoration:underline;">Preferences</a>
                &nbsp;·&nbsp;
                <a href="{unsub_url}" style="color:{_MUTED};text-decoration:underline;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="{SITE_URL}" style="color:{_MUTED};text-decoration:underline;">gitstack.pro</a>
              </p>
            </td></tr>
          </table>
        </td></tr>
        """
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:{_CREAM};font-family:{_FONT_BODY};color:{_CHARCOAL};">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        {body}
        {footer}
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _build_from_header(sender_key: str) -> dict:
    sender = SENDERS.get(sender_key, SENDERS["hello"])
    return {"From": f"{sender['name']} <{sender['email']}>"}


async def send_email(
    to: list[EmailStr],
    subject: str,
    body: str,
    subtype: str = "html",
    sender: str = "hello",
    reply_to: str = None,
):
    headers = _build_from_header(sender)
    rt = reply_to or HELP_EMAIL
    message = MessageSchema(
        subject=subject,
        recipients=to,
        body=body,
        subtype=subtype,
        headers=headers,
        reply_to=[rt],
    )
    await mail.send_message(message)


# ── Marketplace Emails ────────────────────────────────────────────

async def send_purchase_confirmation(to_email: str, product_title: str, purchase_type: str, download_url: str):
    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo_text('Marketplace')}</td>
        </tr>
      </table>
    </td></tr>

    {_hero("Purchase Confirmed 🎉", f"You bought: <strong>{product_title}</strong>", _GREEN)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Type: {purchase_type.replace('_', ' ').title()}
      </p>
      <p style="margin:12px 0 0;font-family:{_FONT_BODY};font-size:15px;color:{_CHARCOAL};line-height:1.6;">
        {_link("Download Your Purchase", download_url, _RED)}
      </p>
    </td></tr>

    <tr><td style="padding:16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="border-top:1px dashed {_CHARCOAL};padding-top:16px;">
          <p style="margin:0;font-family:{_FONT_BODY};font-size:13px;color:{_MUTED};line-height:1.5;">
            Questions? Reply to this email or reach out to <a href="mailto:{HELP_EMAIL}" style="color:{_MUTED};text-decoration:underline;">{HELP_EMAIL}</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
    """
    html = _email_shell(f"Purchase Confirmation: {product_title}", body)
    await send_email(
        [to_email],
        f"Purchase Confirmation: {product_title}",
        html,
        sender="marketplace",
    )


async def send_setup_request_notification(to_email: str, product_title: str, setup_request_id: str):
    seller_dashboard = SITE_URL + "/sell"
    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo_text('Marketplace')}</td>
        </tr>
      </table>
    </td></tr>

    {_hero("New Setup Request 🔧", f"A buyer purchased <strong>{product_title}</strong> with setup service.", _YELLOW)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:15px;color:{_CHARCOAL};line-height:1.6;">
        Request ID: <code style="font-family:{_FONT_MONO};font-size:13px;background:{_LIGHT};padding:2px 6px;border-radius:4px;">{setup_request_id}</code>
      </p>
      <p style="margin:12px 0 0;font-family:{_FONT_BODY};font-size:15px;color:{_CHARCOAL};line-height:1.6;">
        {_link("Seller Dashboard", seller_dashboard, _RED)}
      </p>
      <p style="margin:8px 0 0;font-family:{_FONT_BODY};font-size:13px;color:{_MUTED};">
        Please review and start the setup process as soon as possible.
      </p>
    </td></tr>
    """
    html = _email_shell(f"New Setup Request: {product_title}", body)
    await send_email(
        [to_email],
        f"New Setup Request: {product_title}",
        html,
        sender="marketplace",
    )


async def send_setup_complete_notification(to_email: str, product_title: str, download_url: str):
    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo_text('Marketplace')}</td>
        </tr>
      </table>
    </td></tr>

    {_hero("Your Setup is Ready 🚀", f"Great news! Your <strong>{product_title}</strong> setup has been completed by the seller.", _GREEN)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:15px;color:{_CHARCOAL};line-height:1.6;">
        {_link("Download + Docs", download_url, _RED)}
      </p>
      <p style="margin:8px 0 0;font-family:{_FONT_BODY};font-size:13px;color:{_MUTED};">
        Need help? Reply to this email or contact <a href="mailto:{HELP_EMAIL}" style="color:{_MUTED};text-decoration:underline;">{HELP_EMAIL}</a>.
      </p>
    </td></tr>
    """
    html = _email_shell(f"Setup Complete: {product_title}", body)
    await send_email(
        [to_email],
        f"Setup Complete: {product_title}",
        html,
        sender="marketplace",
    )


async def send_payout_notification(to_email: str, amount_cents: int, method: str):
    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo_text('Marketplace')}</td>
        </tr>
      </table>
    </td></tr>

    {_hero("Payout Initiated 💰", f"A payout of <strong>${amount_cents / 100:.2f}</strong> has been initiated to your {method} account.", _PURPLE)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:15px;color:{_CHARCOAL};line-height:1.6;">
        This will be processed within <strong>3-5 business days</strong>.
      </p>
      <p style="margin:12px 0 0;font-family:{_FONT_BODY};font-size:15px;color:{_CHARCOAL};line-height:1.6;">
        {_link("Seller Dashboard", "https://gitstack.pro/sell", _RED)}
      </p>
    </td></tr>
    """
    html = _email_shell(f"Payout: ${amount_cents / 100:.2f}", body)
    await send_email(
        [to_email],
        f"Payout: ${amount_cents / 100:.2f}",
        html,
        sender="marketplace",
    )


async def send_new_review_notification(to_email: str, product_title: str, rating: int, review_text: str, product_url: str):
    stars = "★" * rating + "☆" * (5 - rating)
    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo_text('Marketplace')}</td>
        </tr>
      </table>
    </td></tr>

    {_hero("New Review ⭐", f"Your product <strong>{product_title}</strong> just received a new review.", _PURPLE)}
    {_divider()}

    {_section(stars, f'"{review_text}"', _YELLOW)}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:15px;color:{_CHARCOAL};line-height:1.6;">
        {_link("View on Product Page", product_url, _RED)}
      </p>
    </td></tr>
    """
    html = _email_shell(f"New Review on {product_title}", body)
    await send_email(
        [to_email],
        f"New Review on {product_title}",
        html,
        sender="marketplace",
    )


# ── Marketing Emails ──────────────────────────────────────────────

async def send_welcome_email(to_email: str, name: str = None):
    first_name = name.split()[0] if name else "there"
    repo_of_day = SITE_URL + "/repo-of-the-day"
    token = _generate_email_token(to_email)
    prefs_url = f"{SITE_URL}/preferences?token={token}"
    unsub_url = f"{SITE_URL}/unsubscribe?token={token}"

    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo_text()}</td>
        </tr>
      </table>
    </td></tr>

    {_hero("Welcome to GitStack", "The open-source toolkit for founders who'd rather own their stack than rent it.", _GREEN)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Hey {first_name},
      </p>
      <p style="margin:8px 0 0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        You just joined <strong>4,300+ founders</strong> who discover open-source tools that replace expensive SaaS. Every morning you'll get a curated tool with setup steps and real business value.
      </p>
    </td></tr>

    {_section("Tomorrow's Daily Drop", "Your first curated tool lands tomorrow morning. One open-source tool explained in plain English — how it works, what it replaces, and how to set it up.", _ORANGE)}
    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("See Today's Tool", repo_of_day, _RED)}</p></td></tr>

    {_section("Pick your stack", "Tell us what you're building and we'll generate a complete open-source stack — database, auth, hosting, analytics, the works.", _BLUE)}
    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("Build your stack", f"{SITE_URL}/stack-generator", _RED)}</p></td></tr>

    <tr><td style="padding:16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="border-top:1px dashed {_CHARCOAL};padding-top:16px;">
          <p style="margin:0;font-family:{_FONT_BODY};font-size:15px;color:{_CHARCOAL};line-height:1.6;">
            <strong>What are you building?</strong> Hit reply and tell me — I read every response.
          </p>
        </td></tr>
      </table>
    </td></tr>
    """
    html = _email_shell("Welcome to GitStack", body, prefs_url, unsub_url)
    await send_email(
        [to_email],
        "Welcome to GitStack — Your first Daily Drop lands tomorrow",
        html,
        sender="hello",
    )


async def send_stack_email(to_email: str, idea: str, tools: list, stack_url: str = None):
    """Email a saved stack to the user."""
    stack_gen = SITE_URL + "/stack-generator"
    token = _generate_email_token(to_email)
    prefs_url = f"{SITE_URL}/preferences?token={token}"
    unsub_url = f"{SITE_URL}/unsubscribe?token={token}"
    _accents = [_ORANGE, _GREEN, _PURPLE, _YELLOW, _BLUE, _RED]

    tools_html = ""
    for i, tool in enumerate(tools[:6]):
        accent = _accents[i % len(_accents)]
        tool_name = tool.get("name") or tool.get("title") or "Tool"
        tool_desc = tool.get("description") or ""
        if isinstance(tool.get("what_you_can_build"), list):
            tool_desc = tool.get("what_you_can_build", [""])[0] or tool_desc
        tools_html += _section(tool_name, f"{tool_desc}<br><br>{_link('Learn more', tool.get('url', SITE_URL), accent)}", accent)

    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo_text('Stack')}</td>
        </tr>
      </table>
    </td></tr>

    {_hero(f"Your Stack: {idea[:50]}{'...' if len(idea) > 50 else ''}", "Don't lose it. Here are the tools we picked for your idea:", _YELLOW)}
    {_divider()}

    {tools_html}

    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("Generate Another Stack", stack_gen, _RED)}</p></td></tr>
    <tr><td style="padding:0 0 16px;"><p style="margin:0;font-family:{_FONT_BODY};font-size:13px;color:{_MUTED};">We'll send you a follow-up in 48 hours with setup tips.</p></td></tr>
    """
    html = _email_shell(f"Your stack: {idea[:40]}{'...' if len(idea) > 40 else ''}", body, prefs_url, unsub_url)
    await send_email(
        [to_email],
        f"Your stack: {idea[:40]}{'...' if len(idea) > 40 else ''}",
        html,
        sender="hello",
    )


# ── Preferences Link Email ────────────────────────────────────────

async def send_preferences_link(to_email: str, token: str):
    """Send a link to manage email preferences."""
    preferences_url = f"{SITE_URL}/newsletter/preferences?token={token}"
    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo_text()}</td>
        </tr>
      </table>
    </td></tr>

    {_hero("Manage Your Preferences", "Update what emails you receive from GitStack.", _BLUE)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Click the link below to update your email preferences — choose which emails you want to receive.
      </p>
      <p style="margin:16px 0 0;font-family:{_FONT_BODY};font-size:15px;color:{_CHARCOAL};line-height:1.6;">
        {_link("Manage Preferences", preferences_url, _RED)}
      </p>
      <p style="margin:16px 0 0;font-family:{_FONT_BODY};font-size:13px;color:{_MUTED};line-height:1.5;">
        If you didn't request this, you can safely ignore it.
      </p>
    </td></tr>
    """
    html = _email_shell("Manage Your GitStack Preferences", body)
    await send_email(
        [to_email],
        "Manage your GitStack email preferences",
        html,
        sender="hello",
    )
