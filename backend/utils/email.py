import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
from dotenv import load_dotenv

load_dotenv()

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

async def send_email(to: list[EmailStr], subject: str, body: str, subtype: str = "html"):
    """Send an email via SMTP."""
    message = MessageSchema(
        subject=subject,
        recipients=to,
        body=body,
        subtype=subtype,
    )
    await mail.send_message(message)

async def send_purchase_confirmation(to_email: str, product_title: str, purchase_type: str, download_url: str):
    body = f"""<html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Thank you for your purchase!</h2>
        <p>You bought: <strong>{product_title}</strong></p>
        <p>Type: {purchase_type.replace("_", " ").title()}</p>
        <p><a href="{download_url}" style="display: inline-block; padding: 10px 20px; background: #2563EB; color: white; text-decoration: none; border-radius: 5px;">Download Your Purchase</a></p>
        <p style="color: #666; font-size: 12px;">If you have any issues, reply to this email.</p>
    </body>
</html>"""
    await send_email([EmailStr(to_email)], f"Purchase Confirmation: {product_title}", body)

async def send_setup_request_notification(to_email: str, product_title: str, setup_request_id: str):
    body = f"""<html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>New Setup Request</h2>
        <p>A buyer purchased <strong>{product_title}</strong> with setup service.</p>
        <p>Request ID: {setup_request_id}</p>
        <p>Please review and start the setup process in your <a href="https://gitstack.pro/sell">Seller Dashboard</a>.</p>
    </body>
</html>"""
    await send_email([EmailStr(to_email)], f"New Setup Request: {product_title}", body)

async def send_payout_notification(to_email: str, amount_cents: int, method: str):
    body = f"""<html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Payout Initiated</h2>
        <p>A payout of <strong>${amount_cents / 100:.2f}</strong> has been initiated to your {method} account.</p>
        <p>This will be processed within 3-5 business days.</p>
    </body>
</html>"""
    await send_email([EmailStr(to_email)], f"Payout: ${amount_cents / 100:.2f}", body)
