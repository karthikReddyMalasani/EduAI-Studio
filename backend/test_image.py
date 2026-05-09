import os
import sys
import django
import traceback

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from testgen.services.ai_service import generate_visual_aid
from django.conf import settings
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY,
)

import requests
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from django.conf import settings

headers = {"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"}
response = requests.get("https://openrouter.ai/api/v1/models", headers=headers)

if response.status_code == 200:
    models = response.json().get("data", [])
    with open("models.log", "w", encoding="utf-8") as f:
        for m in models:
            f.write(m.get("id", "") + "\n")
else:
    print(f"Failed: {response.status_code}")

