#!/usr/bin/env python3
"""24/7 TikTok photo publisher. Reads env from the same directory's .env file."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

TT_TOKEN = "https://open.tiktokapis.com/v2/oauth/token/"
TT_CREATOR = "https://open.tiktokapis.com/v2/post/publish/creator_info/query/"
TT_PHOTO_INIT = "https://open.tiktokapis.com/v2/post/publish/content/init/"
TT_STATUS = "https://open.tiktokapis.com/v2/post/publish/status/fetch/"
PRIVACY_FALLBACK = [
    "PUBLIC_TO_EVERYONE",
    "MUTUAL_FOLLOW_FRIENDS",
    "FOLLOWER_OF_CREATOR",
    "SELF_ONLY",
]


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        os.environ.setdefault(key.strip(), val.strip().strip("'").strip('"'))


def rest(url: str, method: str, headers: dict, body: bytes | None = None) -> dict:
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            raise RuntimeError(raw or str(e)) from e


def sb(path: str, method: str = "GET", body: dict | None = None, prefer: str | None = None) -> object:
    base = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    payload = json.dumps(body).encode() if body is not None else None
    return rest(f"{base}/rest/v1/{path}", method, headers, payload)


def editorial_title(text: str | None) -> str:
    first = (text or "").split("\n---\n")[0].strip()
    return first or (text or "").strip()


def pick_privacy(requested: str, options: list[str]) -> str:
    if requested in options:
        return requested
    for item in PRIVACY_FALLBACK:
        if item in options:
            return item
    return options[0] if options else "SELF_ONLY"


def valid_token(user_id: str) -> str:
    rows = sb(
        "tiktok_accounts?"
        + urllib.parse.urlencode({"user_id": f"eq.{user_id}", "order": "updated_at.desc", "limit": "1"}),
    )
    if not isinstance(rows, list) or not rows:
        raise RuntimeError("TikTok is not connected")
    row = rows[0]
    expires = datetime.fromisoformat(str(row["expires_at"]).replace("Z", "+00:00")).timestamp()
    if expires - time.time() > 5 * 60:
        return row["access_token"]
    body = urllib.parse.urlencode(
        {
            "client_key": os.environ["TIKTOK_CLIENT_KEY"],
            "client_secret": os.environ["TIKTOK_CLIENT_SECRET"],
            "grant_type": "refresh_token",
            "refresh_token": row["refresh_token"],
        }
    ).encode()
    j = rest(
        TT_TOKEN,
        "POST",
        {"Content-Type": "application/x-www-form-urlencoded"},
        body,
    )
    if j.get("error"):
        raise RuntimeError(j.get("error_description") or "TikTok refresh failed")
    expires_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + int(j.get("expires_in", 86400))))
    sb(
        f"tiktok_accounts?id=eq.{row['id']}",
        "PATCH",
        {
            "access_token": j["access_token"],
            "refresh_token": j.get("refresh_token") or row["refresh_token"],
            "expires_at": expires_at,
        },
    )
    return j["access_token"]


def privacy_options(token: str) -> list[str]:
    j = rest(
        TT_CREATOR,
        "POST",
        {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=UTF-8",
        },
        b"{}",
    )
    opts = (j.get("data") or {}).get("privacy_level_options")
    return opts if isinstance(opts, list) and opts else ["SELF_ONLY"]


def publish(post: dict) -> None:
    if post.get("tiktok_publish_id") or post.get("tiktok_status") in {
        "PUBLISHING",
        "PROCESSING",
        "PROCESSING_UPLOAD",
        "PUBLISH_COMPLETE",
    }:
        return
    urls = [
        u
        for u in (post.get("export_slide_urls") or [])
        if isinstance(u, str) and u.startswith("http") and ".mp4" not in u.lower()
    ]
    if not urls:
        raise RuntimeError("No export slides")
    token = valid_token(post["user_id"])
    privacy = pick_privacy(post.get("tiktok_privacy_level") or "SELF_ONLY", privacy_options(token))
    title = editorial_title(post.get("hook")) or "Ryval"
    description = "\n\n".join([x for x in [post.get("caption"), post.get("hashtags")] if x]) or title
    sb(
        f"posts?id=eq.{post['id']}",
        "PATCH",
        {"tiktok_status": "PUBLISHING", "tiktok_error": None, "tiktok_privacy_level": privacy},
    )
    def photo_init(level):
        return rest(
            TT_PHOTO_INIT,
            "POST",
            {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json; charset=UTF-8",
            },
            json.dumps(
                {
                    "post_mode": "DIRECT_POST",
                    "media_type": "PHOTO",
                    "post_info": {
                        "title": title[:90],
                        "description": description[:2200],
                        "privacy_level": level,
                        "disable_comment": True,
                        "auto_add_music": True,
                        "brand_content_toggle": False,
                        "brand_organic_toggle": False,
                    },
                    "source_info": {
                        "source": "PULL_FROM_URL",
                        "photo_cover_index": 0,
                        "photo_images": urls[:35],
                    },
                }
            ).encode(),
        )

    init = photo_init(privacy)
    err = init.get("error") or {}
    if (
        err.get("code")
        and err.get("code") != "ok"
        and privacy != "SELF_ONLY"
        and (
            err.get("code") == "unaudited_client_can_only_post_to_private_accounts"
            or "content-sharing-guidelines" in (err.get("message") or "")
        )
    ):
        privacy = "SELF_ONLY"
        init = photo_init(privacy)
        err = init.get("error") or {}
    if err.get("code") and err.get("code") != "ok":
        msg = err.get("message") or json.dumps(init)
        if "content-sharing-guidelines" in msg or err.get("code") == "unaudited_client_can_only_post_to_private_accounts":
            msg = "Set the TikTok account to Private and post Only me until the app is audited."
        sb(f"posts?id=eq.{post['id']}", "PATCH", {"tiktok_status": "FAILED", "tiktok_error": msg})
        raise RuntimeError(msg)
    publish_id = (init.get("data") or {}).get("publish_id")
    sb(
        f"posts?id=eq.{post['id']}",
        "PATCH",
        {"tiktok_publish_id": publish_id, "tiktok_status": "PROCESSING"},
    )
    for _ in range(12):
        time.sleep(2.5)
        status_json = rest(
            TT_STATUS,
            "POST",
            {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json; charset=UTF-8",
            },
            json.dumps({"publish_id": publish_id}).encode(),
        )
        status = (status_json.get("data") or {}).get("status") or "PROCESSING_UPLOAD"
        if status == "PUBLISH_COMPLETE":
            sb(
                f"posts?id=eq.{post['id']}",
                "PATCH",
                {
                    "tiktok_status": status,
                    "status": "posted",
                    "posted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "tiktok_error": None,
                },
            )
            return
        if status == "FAILED":
            fail = (status_json.get("data") or {}).get("fail_reason") or "TikTok reported FAILED"
            sb(f"posts?id=eq.{post['id']}", "PATCH", {"tiktok_status": "FAILED", "tiktok_error": fail})
            raise RuntimeError(fail)


def main() -> int:
    load_env(Path(__file__).resolve().parent / ".env")
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    q = urllib.parse.urlencode(
        {
            "status": "eq.scheduled",
            "scheduled_date": f"lte.{now}",
            "tiktok_publish_id": "is.null",
            "order": "scheduled_date.asc",
            "limit": "5",
        }
    )
    due = sb(f"posts?{q}")
    if not isinstance(due, list):
        print(json.dumps({"error": due}))
        return 1
    results = []
    for post in due:
        try:
            publish(post)
            results.append({"id": post["id"], "ok": True})
        except Exception as e:  # noqa: BLE001
            msg = str(e)
            sb(f"posts?id=eq.{post['id']}", "PATCH", {"tiktok_status": "FAILED", "tiktok_error": msg})
            results.append({"id": post["id"], "ok": False, "error": msg})
    print(json.dumps({"processed": len(results), "published": sum(1 for r in results if r["ok"]), "results": results}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
