# Smart Meeting Decision Tracker Backend Package
import re
import django.utils.cache

# Backward compatibility shim for Django 5.1+ where cc_delim_re was removed
if not hasattr(django.utils.cache, 'cc_delim_re'):
    django.utils.cache.cc_delim_re = re.compile(r'\s*,\s*')

# Fix Python 3.14 compatibility with Django 4.2 template context copying
try:
    import django.template.context
    def _patched_basecontext_copy(self):
        duplicate = object.__new__(self.__class__)
        duplicate.__dict__.update(self.__dict__)
        duplicate.dicts = self.dicts.copy()
        return duplicate
    django.template.context.BaseContext.__copy__ = _patched_basecontext_copy
except Exception:
    pass

