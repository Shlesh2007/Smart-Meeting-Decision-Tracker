import os
from pathlib import Path
from datetime import timedelta
import dotenv
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file (check backend dir and root project dir)
dotenv.load_dotenv(BASE_DIR / '.env')
dotenv.load_dotenv(BASE_DIR.parent / '.env')

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-smart-meeting-decision-tracker-secret-key-2026')
DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1', 't')
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'corsheaders',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party packages
    'rest_framework',
    'rest_framework_simplejwt',
    'django_filters',
    
    # Local Apps
    'apps.authentication',
    'apps.teams',
    'apps.meetings',
    'apps.discussions',
    'apps.decisions',
    'apps.actions',
    'apps.analytics',
    'apps.notifications',
]

MIDDLEWARE = [
    'smart_meeting_tracker.middleware.CustomCorsMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'smart_meeting_tracker.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'smart_meeting_tracker.wsgi.application'

# Database Configuration — Prioritizes PostgreSQL from DATABASE_URL or DB_* environment variables
DATABASE_URL = os.environ.get('DATABASE_URL', '').strip()

DB_ENGINE = os.environ.get('DB_ENGINE', '').strip().lower()
DB_NAME = os.environ.get('DB_NAME', '').strip()
DB_USER = os.environ.get('DB_USER', '').strip()
DB_PASSWORD = os.environ.get('DB_PASSWORD', '').strip()
DB_HOST = os.environ.get('DB_HOST', 'localhost').strip()
DB_PORT = os.environ.get('DB_PORT', '5432').strip()

if not DATABASE_URL and (DB_ENGINE == 'postgresql' or DB_NAME):
    from urllib.parse import quote_plus
    encoded_pass = quote_plus(DB_PASSWORD)
    DATABASE_URL = f"postgresql://{DB_USER}:{encoded_pass}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def is_valid_database_url(url):
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    if not (url.startswith('postgres://') or url.startswith('postgresql://')):
        return False
    lower_url = url.lower()
    if '@host:' in lower_url or '@host/' in lower_url or lower_url.endswith('@host') or '@example.com' in lower_url:
        return False
    try:
        parsed = dj_database_url.parse(url)
        return bool(parsed and parsed.get('NAME') and parsed.get('ENGINE'))
    except Exception:
        return False

if is_valid_database_url(DATABASE_URL):
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
elif DB_NAME and DB_USER:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': DB_NAME,
            'USER': DB_USER,
            'PASSWORD': DB_PASSWORD,
            'HOST': DB_HOST,
            'PORT': DB_PORT,
            'CONN_MAX_AGE': 600,
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

db_engine = DATABASES['default'].get('ENGINE', '')
db_host = DATABASES['default'].get('HOST', 'local')
db_name = DATABASES['default'].get('NAME', '')
print(f"📦 [DATABASE CONFIG]: {db_engine} (Host: {db_host}, DB: {db_name})")

# Custom User Model
AUTH_USER_MODEL = 'authentication.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'smart_meeting_tracker.filters.ExactPhraseSearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'smart_meeting_tracker.pagination.CustomPageNumberPagination',
    'PAGE_SIZE': 10,
}

# Simple JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Permissive CORS Settings for Development
CORS_ALLOW_ALL_ORIGINS = True
CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-organization-id',
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Force IPv4 resolution for SMTP connections (fixes [Errno 101] Network is unreachable on Render)
import socket
_original_getaddrinfo = socket.getaddrinfo
def _ipv4_first_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    if family == 0 and ('smtp' in str(host).lower() or 'brevo' in str(host).lower()):
        return _original_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
    return _original_getaddrinfo(host, port, family, type, proto, flags)
socket.getaddrinfo = _ipv4_first_getaddrinfo

# Dedicated Brevo Transactional SMTP Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp-relay.brevo.com').strip()
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'shleshdarji317@gmail.com').strip()
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', os.environ.get('BREVO_API_KEY', '')).replace(' ', '').strip()
EMAIL_TIMEOUT = int(os.environ.get('EMAIL_TIMEOUT', 10))  # 10 second socket timeout

if EMAIL_PORT == 465:
    EMAIL_USE_TLS = False
    EMAIL_USE_SSL = True
else:
    EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 't')
    EMAIL_USE_SSL = os.environ.get('EMAIL_USE_SSL', 'False').lower() in ('true', '1', 't')

DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', f'SmartMeeting Tracker <{EMAIL_HOST_USER}>')

# OAuth 2.0 Credentials
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '1051715789667-m86kur6hnaciip8cp4ghoq08eeso6et3.apps.googleusercontent.com')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', 'Ov23li85R8iyZCz0Yn3h').strip()
GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', '47fcee476647710cdbe167dec11d3ad8f8e689dc').strip()

# Frontend Production Website URL
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://smart-meeting-decision-tracker-zy1o.vercel.app').rstrip('/')

