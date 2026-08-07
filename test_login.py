import urllib.request
import json
url = 'http://localhost:8080/api/admin/auth/login'
data = json.dumps({'email':'info@buyersmatch.com.au', 'password':'bm123'}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code}")
    print(e.read().decode('utf-8'))
