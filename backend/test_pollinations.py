import urllib.parse
import urllib.request
import textwrap

prompt = "A flowchart illustrating the CI/CD pipeline stages for a Flask application, with detailed annotations for each step, including code commit, build, test, deploy, and production release."
short_prompt = textwrap.shorten(prompt, width=100, placeholder="")
enhanced_prompt = f"Graph diagram of {short_prompt}, educational, white background"
encoded_prompt = urllib.parse.quote(enhanced_prompt)
url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=800&height=500&nologo=true"

print("Testing URL:", url)
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    response = urllib.request.urlopen(req)
    print("Status Code:", response.getcode())
    print("Content Type:", response.info().get_content_type())
except Exception as e:
    print("Error:", e)
