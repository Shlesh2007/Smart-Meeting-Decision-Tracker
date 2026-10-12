#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
python seed_user_shlesh.py || true
python manage.py seed_data || true
python seed_meeting_activity.py || true
