import re
import logging
from urllib.parse import urlparse
import requests
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

# Regular expression for Google Meet code (standard format: 3 letters, 4 letters, 3 letters)
MEET_CODE_REGEX = re.compile(r'^[a-z]{3}-[a-z]{4}-[a-z]{3}$', re.IGNORECASE)


def parse_and_validate_meet_url(meet_url):
    """
    Validates the structure of a Google Meet URL:
    1. Must use HTTPS.
    2. Hostname must be exactly meet.google.com.
    3. Meeting code must match standard xxx-yyyy-zzz format.

    Returns:
        (is_valid: bool, error_message: str, meeting_code: str or None)
    """
    if not meet_url or not isinstance(meet_url, str):
        return False, "Meet URL is required and must be a string", None

    meet_url = meet_url.strip()

    try:
        parsed = urlparse(meet_url)
    except Exception:
        return False, "Malformed URL structure", None

    # 1. Scheme must be HTTPS
    if parsed.scheme.lower() != 'https':
        return False, "Google Meet URL must use HTTPS protocol", None

    # 2. Hostname must be exactly meet.google.com
    hostname = (parsed.hostname or '').lower()
    if hostname != 'meet.google.com':
        return False, "URL hostname must be exactly meet.google.com", None

    # 3. Extract path and clean meeting code
    path_segments = [seg for seg in parsed.path.strip('/').split('/') if seg]
    if not path_segments:
        return False, "Google Meet URL path is missing meeting code", None

    meeting_code = path_segments[0].strip().lower()

    # 4. Validate meeting code format (e.g. abc-defg-hij)
    if not MEET_CODE_REGEX.match(meeting_code):
        return False, "Invalid Google Meet meeting code format (expected format: xxx-yyyy-zzz)", None

    return True, "Valid Google Meet URL format", meeting_code


def refresh_google_oauth_token(user):
    """
    Refreshes the user's Google OAuth access token using Google's OAuth 2.0 token endpoint.
    Updates the user model upon success.

    Returns:
        new_access_token (str) or None
    """
    if not user or not getattr(user, 'google_refresh_token', None):
        logger.warning("Token refresh skipped: No refresh token available for user %s", user)
        return None

    client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')
    client_secret = getattr(settings, 'GOOGLE_CLIENT_SECRET', '')

    if not client_secret:
        logger.warning("Token refresh skipped: GOOGLE_CLIENT_SECRET is not configured in settings")
        return None

    payload = {
        'client_id': client_id,
        'client_secret': client_secret,
        'refresh_token': user.google_refresh_token,
        'grant_type': 'refresh_token',
    }

    try:
        resp = requests.post(
            'https://oauth2.googleapis.com/token',
            data=payload,
            timeout=8
        )
        if resp.status_code == 200:
            data = resp.json()
            new_access_token = data.get('access_token')
            expires_in = data.get('expires_in')

            if new_access_token:
                user.google_access_token = new_access_token
                if expires_in:
                    try:
                        user.google_token_expires_at = timezone.now() + timedelta(seconds=int(expires_in))
                    except (ValueError, TypeError):
                        pass
                user.save(update_fields=['google_access_token', 'google_token_expires_at'])
                logger.info("Successfully refreshed Google OAuth token for user %s", user)
                return new_access_token
        else:
            logger.warning("Google token refresh endpoint returned HTTP %s: %s", resp.status_code, resp.text)
    except Exception as e:
        logger.error("Exception occurred during Google token refresh: %s", str(e))

    return None


def verify_google_meet_space(access_token, meeting_code, user=None):
    """
    Queries Google Meet REST API v2:
    GET https://meet.googleapis.com/v2/spaces/{meetingCode}

    Returns:
        (status_code: int, response_payload: dict)
    """
    google_api_url = f"https://meet.googleapis.com/v2/spaces/{meeting_code}"
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Accept': 'application/json',
    }

    try:
        resp = requests.get(google_api_url, headers=headers, timeout=8)

        if resp.status_code == 200:
            data = resp.json()
            # Distinguish space existence from active conference status
            active_conference = data.get('activeConference')
            has_active_conference = bool(active_conference)

            return 200, {
                'valid': True,
                'message': 'Google Meet space verified successfully',
                'meeting_code': meeting_code,
                'meeting_uri': f'https://meet.google.com/{meeting_code}',
                'active': has_active_conference
            }

        elif resp.status_code == 401:
            # Token expired or invalid -> Attempt refresh if user instance provided
            if user:
                new_token = refresh_google_oauth_token(user)
                if new_token:
                    # Retry API call once with new token
                    retry_headers = {'Authorization': f'Bearer {new_token}', 'Accept': 'application/json'}
                    retry_resp = requests.get(google_api_url, headers=retry_headers, timeout=8)
                    if retry_resp.status_code == 200:
                        retry_data = retry_resp.json()
                        has_active_conference = bool(retry_data.get('activeConference'))
                        return 200, {
                            'valid': True,
                            'message': 'Google Meet space verified successfully',
                            'meeting_code': meeting_code,
                            'meeting_uri': f'https://meet.google.com/{meeting_code}',
                            'active': has_active_conference
                        }

            return 401, {
                'valid': False,
                'message': 'Google OAuth access token is invalid or expired. Please re-authenticate.'
            }

        elif resp.status_code == 403:
            return 403, {
                'valid': False,
                'message': 'Required Meet permission/scope is missing or access is forbidden.'
            }

        elif resp.status_code == 404:
            return 404, {
                'valid': False,
                'message': 'Google Meet space was not found'
            }

        else:
            logger.warning("Google Meet API returned unexpected HTTP status %s for code %s", resp.status_code, meeting_code)
            return resp.status_code if resp.status_code in [400, 500, 502, 503] else 502, {
                'valid': False,
                'message': 'Google Meet API returned an unexpected error'
            }

    except requests.Timeout:
        logger.error("Timeout occurred while contacting Google Meet API")
        return 504, {
            'valid': False,
            'message': 'Google Meet API request timed out'
        }
    except Exception as e:
        logger.error("Exception during Google Meet space verification: %s", str(e))
        return 502, {
            'valid': False,
            'message': 'Failed to communicate with Google Meet API'
        }
