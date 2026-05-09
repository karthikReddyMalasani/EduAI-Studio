from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from testgen.views import RegisterView

def api_root(request):
    return JsonResponse({
        "status": "online",
        "message": "EduAI-Studio API is running.",
        "endpoints": {
            "auth": "/api/token/",
            "register": "/api/register/",
            "testgen": "/api/"
        }
    })

urlpatterns = [
    path('', api_root, name='root'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/', include('testgen.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
