# Smart Meeting Decision Tracker Backend Package
import re
import django.utils.cache

# Backward compatibility shim for Django 5.1+ where cc_delim_re was removed
if not hasattr(django.utils.cache, 'cc_delim_re'):
    django.utils.cache.cc_delim_re = re.compile(r'\s*,\s*')
