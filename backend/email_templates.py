"""Primary-inbox optimized email templates for GitStack.

Design rules:
- NO images (logo must be text-based)
- NO colored backgrounds on cards
- NO heavy borders or styled buttons
- Minimal HTML: text, links, spacing, subtle left-border lines
- Cream background for brand feel
- Reply prompts and P.S. for engagement
"""

from datetime import datetime

# ── WTF Design Tokens ─────────────────────────────────────────────
COLORS = {
    "cream": "#FDF7EB",
    "charcoal": "#2A2A2A",
    "red": "#C53B3A",
    "green": "#0C9367",
    "blue": "#09407E",
    "yellow": "#F1B333",
    "orange": "#F07633",
    "purple": "#6758A5",
    "muted": "#6B6560",
    "light": "#F5F0E6",
}

ACCENTS = [COLORS["orange"], COLORS["green"], COLORS["purple"], COLORS["yellow"], COLORS["blue"], COLORS["red"]]

FONTS = {
    "heading": "Georgia, 'Times New Roman', serif",
    "body": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    "mono": "'IBM Plex Mono', 'Courier New', monospace",
}


def _logo_text(badge: str = None) -> str:
    """Text-only logo — no images. Critical for Primary inbox."""
    badge_html = ""
    if badge:
        badge_html = (
            f'<span style="display:inline-block;margin-left:8px;padding:2px 8px;background:{COLORS["charcoal"]};'
            f'color:{COLORS["cream"]};font-family:{FONTS["mono"]};font-size:9px;font-weight:700;'
            f'text-transform:uppercase;letter-spacing:1px;border-radius:9999px;">{badge}</span>'
        )
    return (
        f'<span style="font-family:{FONTS["heading"]};font-size:24px;font-weight:700;color:{COLORS["charcoal"]};letter-spacing:-1px;">Git</span>'
        f'<span style="font-family:{FONTS["heading"]};font-size:24px;font-weight:700;color:{COLORS["red"]};letter-spacing:-1px;">Stack</span>'
        f'{badge_html}'
    )


def _tool_text(index: int, tool: dict, site_url: str) -> str:
    """Minimal text-based tool entry for Primary inbox."""
    accent = ACCENTS[index % len(ACCENTS)]
    name = tool.get("name", "Unknown Tool")
    tagline = tool.get("tagline") or tool.get("description") or "Open-source tool for founders."
    replaces = tool.get("replaces")
    stars = tool.get("stars")
    trend = tool.get("trend")
    category = tool.get("category", "Open Source")
    url = tool.get("url") or site_url
    icon = tool.get("icon_emoji", "🛠️")

    meta = []
    if stars:
        meta.append(f"⭐ {stars:,}")
    if trend:
        meta.append(f"📈 {trend}")
    if category:
        meta.append(f"#{category}")
    meta_str = " · ".join(meta)

    replaces_line = f'<p style="margin:4px 0 0;font-family:{FONTS["mono"]};font-size:11px;color:{COLORS["muted"]};">Replaces: {replaces}</p>' if replaces else ""

    return f"""
    <tr><td style="padding:0 0 20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:3px;background:{accent};font-size:0;line-height:0;">&nbsp;</td>
          <td style="padding-left:12px;">
            <p style="margin:0;font-family:{FONTS['heading']};font-size:18px;font-weight:700;color:{COLORS['charcoal']};">
              {icon} {name}
            </p>
            <p style="margin:4px 0 0;font-family:{FONTS['body']};font-size:15px;color:{COLORS['charcoal']};line-height:1.5;">
              {tagline}
            </p>
            {replaces_line}
            <p style="margin:4px 0 0;font-family:{FONTS['mono']};font-size:11px;color:{COLORS['muted']};">{meta_str}</p>
            <p style="margin:8px 0 0;">
              <a href="{url}" style="color:{accent};font-family:{FONTS['body']};font-size:14px;font-weight:600;text-decoration:underline;">See how it works →</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
    """


def render_daily_drop(
    user_name: str,
    tools: list,
    site_url: str = "https://gitstack.pro",
    unsubscribe_token: str = None,
    preferences_token: str = None,
) -> str:
    """Render the Daily Drop email optimized for Gmail Primary inbox."""
    today = datetime.now().strftime("%B %d, %Y")
    greeting = f"Hey {user_name}," if user_name else "Hey there,"

    tools_html = ""
    for i, tool in enumerate(tools):
        tools_html += _tool_text(i, tool, site_url)

    # Total potential savings
    total_savings = 0
    for t in tools:
        price = t.get("replaces_price_monthly", 0)
        if price:
            total_savings += price

    savings_html = ""
    if total_savings > 0:
        savings_html = f'<p style="margin:0 0 24px;font-family:{FONTS["heading"]};font-size:16px;color:{COLORS["charcoal"]};">💰 Today\'s tools could save you <strong>${total_savings}/mo</strong> on SaaS.</p>'

    unsubscribe_url = f"{site_url}/unsubscribe?token={unsubscribe_token}" if unsubscribe_token else f"{site_url}/unsubscribe"
    preferences_url = f"{site_url}/preferences?token={preferences_token}" if preferences_token else f"{site_url}/preferences"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3 tools that save founders money — {today}</title>
</head>
<body style="margin:0;padding:0;background:{COLORS['cream']};font-family:{FONTS['body']};color:{COLORS['charcoal']};">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="padding-bottom:20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;">
                {_logo_text('Daily Drop')}
              </td>
              <td align="right" style="font-family:{FONTS['mono']};font-size:11px;color:{COLORS['muted']};">
                {today}
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:0 0 20px;">
          <p style="margin:0;font-family:{FONTS['body']};font-size:16px;color:{COLORS['charcoal']};line-height:1.6;">
            {greeting}
          </p>
          <p style="margin:4px 0 0;font-family:{FONTS['body']};font-size:16px;color:{COLORS['charcoal']};line-height:1.6;">
            Three open-source tools that replace expensive SaaS. No fluff, just savings.
          </p>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 0 20px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid {COLORS['charcoal']};"></td></tr></table>
        </td></tr>

        <!-- Tools -->
        {tools_html}

        <!-- Savings -->
        {savings_html}

        <!-- CTA -->
        <tr><td style="padding:0 0 20px;">
          <p style="margin:0;font-family:{FONTS['body']};font-size:15px;color:{COLORS['charcoal']};line-height:1.6;">
            🧩 <a href="{site_url}/stack-generator" style="color:{COLORS['red']};font-weight:600;text-decoration:underline;">Build a complete stack with these tools →</a>
          </p>
        </td></tr>

        <!-- Reply prompt -->
        <tr><td style="padding:20px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-top:1px dashed {COLORS['charcoal']};padding-top:16px;">
              <p style="margin:0;font-family:{FONTS['body']};font-size:15px;color:{COLORS['charcoal']};line-height:1.6;">
                <strong>What are you building?</strong> Hit reply and tell me — I read every response.
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- P.S. -->
        <tr><td style="padding:0 0 20px;">
          <p style="margin:0;font-family:{FONTS['body']};font-size:13px;color:{COLORS['muted']};line-height:1.5;">
            <strong>P.S.</strong> If this landed in Promotions, drag it to Primary so you don't miss tomorrow's tools.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 0 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-top:1px solid {COLORS['charcoal']};padding-top:16px;">
              <p style="margin:0;font-family:{FONTS['body']};font-size:11px;color:{COLORS['muted']};line-height:1.5;">
                <a href="{preferences_url}" style="color:{COLORS['muted']};text-decoration:underline;">Preferences</a>
                &nbsp;·&nbsp;
                <a href="{unsubscribe_url}" style="color:{COLORS['muted']};text-decoration:underline;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="{site_url}" style="color:{COLORS['muted']};text-decoration:underline;">gitstack.pro</a>
              </p>
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""
