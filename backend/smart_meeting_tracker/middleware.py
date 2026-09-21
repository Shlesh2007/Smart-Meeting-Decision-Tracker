from django.http import HttpResponse

class CustomCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            response = HttpResponse()
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Accept, Authorization, Content-Type, X-Requested-With, Origin, DNT, X-CSRFToken"
            response["Access-Control-Max-Age"] = "86400"
            return response

        response = self.get_response(request)
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Accept, Authorization, Content-Type, X-Requested-With, Origin, DNT, X-CSRFToken"
        response["Content-Security-Policy"] = "default-src 'self' data: blob: https:; script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:; img-src 'self' data: blob: https:; connect-src 'self' ws: wss: https: http:;"
        return response
