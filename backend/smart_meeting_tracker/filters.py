from rest_framework import filters

class ExactPhraseSearchFilter(filters.SearchFilter):
    """
    Custom SearchFilter that preserves the exact search query phrase
    instead of splitting words by whitespace or commas.
    Prevents false positive matches when spaces or extra characters are entered.
    """
    def get_search_terms(self, request):
        params = request.query_params.get(self.search_param, '')
        params = params.replace('\x00', '').strip()
        if not params:
            return []
        return [params]
