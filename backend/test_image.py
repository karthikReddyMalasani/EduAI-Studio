import os
import sys
import django
import requests
from openai import OpenAI

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.conf import settings

def test_openrouter():
    print("Testing OpenRouter...")
    headers = {"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"}
    try:
        response = requests.get("https://openrouter.ai/api/v1/models", headers=headers)
        if response.status_code == 200:
            print("OpenRouter OK: Models fetched.")
        else:
            print(f"OpenRouter Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"OpenRouter Connection Failed: {e}")

def test_groq():
    print("\nTesting Groq...")
    api_key = getattr(settings, 'GROQ_API_KEY', '')
    if not api_key:
        print("Groq Error: GROQ_API_KEY not found in settings.")
        return

    client = OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=api_key
    )
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "Hello!"}],
            max_tokens=10
        )
        print(f"Groq OK: {response.choices[0].message.content}")
    except Exception as e:
        print(f"Groq Error: {e}")

if __name__ == "__main__":
    test_openrouter()
    test_groq()
