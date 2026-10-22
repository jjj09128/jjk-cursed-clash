#!/usr/bin/env python3
import os
import sys
import json
import hashlib
import base64
import urllib.request
import urllib.error
import urllib.parse

TOKEN = "nfp_1xnFpaDYPLxPnb3a6gmKTS5uYZV7fujz0376"
API = "https://api.netlify.com/api/v1"
ROOT = "."

WEB_FILES = [
    "index.html",
    "css/style.css",
]
for f in os.listdir("js"):
    WEB_FILES.append(f"js/{f}")

def api_request(path, method="GET", data=None, headers=None, raw=False):
    url = API + path
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("User-Agent", "deploy-script")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    if data is not None:
        if isinstance(data, bytes):
            req.data = data
        else:
            req.data = json.dumps(data).encode("utf-8")
            req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = resp.read()
            if raw:
                return body
            return json.loads(body.decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode('utf-8')}")
        raise

def sha1_file(path):
    h = hashlib.sha1()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(65536)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()

def list_sites():
    return api_request("/sites")

def create_site(name):
    return api_request("/sites", method="POST", data={
        "name": name,
        "build_settings": {"repo_url": None},
        "processing_settings": {"html": {"pretty_urls": False}}
    })

def create_deploy(site_id, files):
    return api_request(f"/sites/{site_id}/deploys", method="POST", data={"files": files, "async": False})

def upload_file(deploy_id, rel_path, content):
    encoded = urllib.parse.quote(rel_path, safe="/")
    return api_request(f"/deploys/{deploy_id}/files/{encoded}", method="PUT", data=content, headers={"Content-Type": "application/octet-stream"})

def main():
    print("Listing sites...")
    sites = list_sites()
    site = None
    for s in sites:
        if s.get("name", "").startswith("jujutsu-kaisen-cursed-clash"):
            site = s
            print(f"Found existing site: {s['name']} ({s['id']})")
            break
    if not site:
        print("Creating new site...")
        site = create_site("jujutsu-kaisen-cursed-clash")
        print(f"Created site: {site['name']} ({site['id']})")

    site_id = site["id"]
    url = site.get("url") or site.get("ssl_url") or f"https://{site['subdomain']}.netlify.app"

    print("Calculating file hashes...")
    files = {}
    file_contents = {}
    for rel in WEB_FILES:
        abs_path = os.path.join(ROOT, rel)
        if not os.path.isfile(abs_path):
            print(f"Skip missing: {rel}")
            continue
        sha = sha1_file(abs_path)
        files[rel] = sha
        with open(abs_path, "rb") as f:
            file_contents[rel] = f.read()
        print(f"  {rel} -> {sha[:8]}")

    print("Creating deploy...")
    deploy = create_deploy(site_id, files)
    deploy_id = deploy["id"]
    required = deploy.get("required", [])
    print(f"Deploy ID: {deploy_id}")
    print(f"Required uploads: {len(required)}")

    if required:
        for rel, sha in files.items():
            if sha in required or rel in required:
                print(f"Uploading {rel}...")
                upload_file(deploy_id, rel, file_contents[rel])

    print("Waiting for deploy to be ready...")
    for _ in range(30):
        d = api_request(f"/sites/{site_id}/deploys/{deploy_id}")
        state = d.get("state")
        print(f"  state: {state}")
        if state == "ready":
            break
        import time
        time.sleep(2)
    else:
        print("Deploy did not become ready in time")
        sys.exit(1)

    print(f"\nDeployed to: {url}")
    print(f"Deploy URL: {deploy.get('deploy_url') or deploy.get('deploy_ssl_url') or url}")

if __name__ == "__main__":
    main()
