import logging
import requests
from django.conf import settings
from django.core.mail import get_connection, EmailMessage
from django.utils import timezone

logger = logging.getLogger(__name__)

def send_brevo_transactional_email(subject, recipients, text_content, html_content=None):
    """
    Unified transactional email delivery utility.
    
    1. Primary: Brevo HTTPS REST API (api.brevo.com/v3/smtp/email) on port 443 (bypasses ISP/cloud SMTP port blocks).
    2. Secondary Fallback: Multi-Port SMTP Relay (ports 587, 2525, 465).
    
    Returns tuple: (success: bool, message: str)
    """
    if isinstance(recipients, str):
        recipients = [recipients]

    recipients = list(set([r.strip() for r in recipients if r and isinstance(r, str)]))
    if not recipients:
        return False, "No valid recipient email addresses provided."

    brevo_api_key = getattr(settings, 'EMAIL_HOST_PASSWORD', '').replace(' ', '').strip()
    sender_email = getattr(settings, 'EMAIL_HOST_USER', 'shleshdarji317@gmail.com').strip()
    from_name = 'SmartMeeting Tracker'

    # 1. Primary Attempt: Brevo HTTPS REST API (Port 443)
    if brevo_api_key:
        try:
            api_headers = {
                'accept': 'application/json',
                'api-key': brevo_api_key,
                'content-type': 'application/json',
            }
            to_payload = [{'email': addr} for addr in recipients]
            api_payload = {
                'sender': {'name': from_name, 'email': sender_email},
                'to': to_payload,
                'subject': subject,
                'textContent': text_content,
            }
            if html_content:
                api_payload['htmlContent'] = html_content

            resp = requests.post(
                'https://api.brevo.com/v3/smtp/email',
                json=api_payload,
                headers=api_headers,
                timeout=10
            )

            if resp.status_code in (200, 201, 202):
                logger.info("Brevo HTTPS API delivered email successfully to %s", recipients)
                return True, f"Email delivered successfully to {len(recipients)} recipient(s) via Brevo API."
            else:
                err_detail = resp.text
                try:
                    err_json = resp.json()
                    err_detail = err_json.get('message', resp.text)
                except Exception:
                    pass
                logger.warning("Brevo HTTPS API returned status %s: %s", resp.status_code, err_detail)
        except Exception as api_err:
            logger.warning("Brevo HTTPS API exception: %s", str(api_err))

    # 2. Secondary Fallback: Multi-Port Brevo SMTP Relay
    brevo_host = getattr(settings, 'EMAIL_HOST', 'smtp-relay.brevo.com')
    configured_port = int(getattr(settings, 'EMAIL_PORT', 587))
    brevo_ports = [
        (configured_port, configured_port != 465, configured_port == 465),
        (2525, True, False),
        (587, True, False),
        (465, False, True),
    ]

    seen = set()
    unique_ports = []
    for p, tls, ssl in brevo_ports:
        if p not in seen:
            seen.add(p)
            unique_ports.append((p, tls, ssl))

    smtp_errors = []
    for port, use_tls, use_ssl in unique_ports:
        try:
            connection = get_connection(
                backend='django.core.mail.backends.smtp.EmailBackend',
                host=brevo_host,
                port=port,
                username=sender_email,
                password=brevo_api_key,
                use_tls=use_tls,
                use_ssl=use_ssl,
                timeout=getattr(settings, 'EMAIL_TIMEOUT', 8),
            )
            mail = EmailMessage(
                subject=subject,
                body=html_content or text_content,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', f'{from_name} <{sender_email}>'),
                to=recipients,
                connection=connection,
            )
            if html_content:
                mail.content_subtype = "html"
            mail.send(fail_silently=False)
            logger.info("Brevo SMTP delivered email successfully to %s via port %s", recipients, port)
            return True, f"Email delivered successfully to {len(recipients)} recipient(s) via Brevo SMTP (Port {port})."
        except Exception as e:
            smtp_errors.append(f"Port {port}: {str(e)}")

    error_msg = f"Email delivery failed. Brevo API & SMTP Errors: {'; '.join(smtp_errors)}"
    logger.error("All email delivery attempts failed for recipients %s: %s", recipients, error_msg)
    return False, error_msg


def build_meeting_email_html(meeting, otp_code=None, title_prefix="Meeting Invitation"):
    """
    Generates a responsive HTML email template for meeting invitations, OTPs, and reminders.
    """
    location = meeting.location or "Online"
    is_meet_link = "meet.google.com" in location.lower() or location.startswith("http")
    meet_button_html = ""
    if is_meet_link:
        meet_url = location if location.startswith("http") else f"https://{location}"
        meet_button_html = f"""
        <div style="margin: 20px 0; text-align: center;">
            <a href="{meet_url}" target="_blank" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                🚀 Join Google Meet
            </a>
        </div>
        """

    otp_box_html = ""
    if otp_code:
        otp_box_html = f"""
        <div style="background-color: #f0f9ff; border: 2px dashed #0284c7; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
            <div style="font-size: 13px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">🔑 Participant Entry OTP Code</div>
            <div style="font-size: 32px; font-weight: 900; font-family: 'Courier New', Courier, monospace; letter-spacing: 8px; color: #0284c7;">{otp_code}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Present this code to confirm your meeting attendance</div>
        </div>
        """

    current_year = timezone.now().year

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
        .container {{ max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
        .header {{ background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 26px 32px; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 20px; font-weight: 800; }}
        .header p {{ color: #93c5fd; margin: 4px 0 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }}
        .content {{ padding: 32px; }}
        .meeting-title {{ font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 16px; line-height: 1.3; }}
        .info-card {{ background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; }}
        .info-row {{ display: flex; margin-bottom: 10px; font-size: 14px; line-height: 1.5; }}
        .info-label {{ width: 110px; font-weight: 700; color: #64748b; flex-shrink: 0; }}
        .info-val {{ color: #0f172a; font-weight: 600; word-break: break-word; }}
        .desc-box {{ background: #ffffff; border-left: 4px solid #2563eb; padding: 12px 16px; font-size: 13px; color: #334155; line-height: 1.6; margin-top: 16px; border-radius: 0 8px 8px 0; }}
        .footer {{ background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚡ SmartMeeting Decision Tracker</h1>
          <p>{title_prefix}</p>
        </div>
        <div class="content">
          <div class="meeting-title">{meeting.title}</div>
          
          <div class="info-card">
            <div class="info-row"><span class="info-label">📅 Date:</span><span class="info-val">{meeting.meeting_date}</span></div>
            <div class="info-row"><span class="info-label">⏰ Time:</span><span class="info-val">{meeting.start_time} - {meeting.end_time}</span></div>
            <div class="info-row"><span class="info-label">📍 Location:</span><span class="info-val">{location}</span></div>
            <div class="info-row"><span class="info-label">👤 Organizer:</span><span class="info-val">{meeting.created_by.get_full_name() or meeting.created_by.username} ({meeting.created_by.email})</span></div>
            <div class="info-row"><span class="info-label">🏷️ Type:</span><span class="info-val">{meeting.get_meeting_type_display()}</span></div>
          </div>

          {meet_button_html}

          {otp_box_html}

          {f'<div class="desc-box"><strong>Agenda / Description:</strong><br>{meeting.description}</div>' if meeting.description else ''}

          <p style="font-size: 13px; color: #64748b; margin-top: 24px; margin-bottom: 0;">
            Please log in to your <a href="http://localhost:3000" style="color: #2563eb; text-decoration: underline;">SmartMeeting Tracker Dashboard</a> to view agenda details, decisions, and action items.
          </p>
        </div>
        <div class="footer">
          Automated notification sent by SmartMeeting Decision Tracker.<br>
          © {current_year} SmartMeeting Tracker. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    """
