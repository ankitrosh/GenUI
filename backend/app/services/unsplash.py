import os
import requests
from typing import Any, Dict, List

def search_unsplash(
    query: str,
    per_page: int = 5,
    orientation: str | None = None,
) -> List[Dict[str, Any]]:
    access_key = os.getenv("UNSPLASH_ACCESS_KEY")
    if not access_key:
        raise RuntimeError("Missing UNSPLASH_ACCESS_KEY env var")

    headers = {"Authorization": f"Client-ID {access_key}"}
    url = "https://api.unsplash.com/search/photos"
    params: Dict[str, Any] = {"query": query, "per_page": per_page}
    if orientation:
        params["orientation"] = orientation

    r = requests.get(url, headers=headers, params=params, timeout=15)
    r.raise_for_status()
    data = r.json()

    results = []
    for p in data.get("results", []):
        results.append({
            "id": p.get("id"),
            "description": p.get("description") or p.get("alt_description"),
            "author": (p.get("user") or {}).get("name"),
            "link": (p.get("links") or {}).get("html"),
            "urls": p.get("urls") or {},
        })
    return results
