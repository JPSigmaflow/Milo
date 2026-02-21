#!/usr/bin/env python3
import sys
from instagrapi import Client
from pathlib import Path

code = sys.argv[1] if len(sys.argv) > 1 else input("2FA Code: ")

SESSION_FILE = Path("/Users/milo/.openclaw/workspace/shared/pomesteam/instagram_session.json")
IMAGE_PATH = "/Users/milo/.openclaw/workspace/shared/pomesteam/content/batch-2/02-pearl-necklace.jpg"
CAPTION = """Elegance is an attitude 💎🐾
Some dogs wear collars. Mine wears pearls.

La elegancia es una actitud 💎🐾
Algunos perros usan collares. La mía usa perlas.

#pomeranian #fancydog #dogfashion #pearls #perlaparaperros #pomlife #dogsofinstagram #elegantdog"""

cl = Client()
cl.delay_range = [1, 2]

cl.login("pomesteam", "Pomesteam1985", verification_code=code)
print("✅ Logged in!")

SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)
cl.dump_settings(SESSION_FILE)
print("✅ Session saved!")

media = cl.photo_upload(IMAGE_PATH, CAPTION)
print(f"✅ POSTED! https://www.instagram.com/p/{media.code}/")
