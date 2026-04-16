import json, urllib.parse, urllib.request
UA = {"User-Agent": "PicoryBot/1.0"}
for q in ["Sony A6700", "Canon EOS R50 V", "Sony ILCE-6700"]:
    params = urllib.parse.urlencode({"action": "query", "list": "search", "srsearch": q, "format": "json", "srnamespace": "6", "srlimit": "8"})
    url = f"https://commons.wikimedia.org/w/api.php?{params}"
    r = urllib.request.urlopen(urllib.request.Request(url, headers=UA))
    data = json.loads(r.read().decode("utf-8"))
    print("===", q)
    for h in data.get("query", {}).get("search", []):
        print(" ", h["title"].encode("ascii", "replace").decode("ascii"))
