#!/usr/bin/env python3
"""
Instagram Post Script using instagrapi
"""
import sys
import os
from pathlib import Path
from instagrapi import Client

# Session file for persistent login
SESSION_FILE = Path.home() / ".openclaw" / "workspace" / "shared" / "pomesteam" / "instagram_session.json"

def login(username, password):
    """Login to Instagram and save session"""
    cl = Client()
    
    # Try to load existing session
    if SESSION_FILE.exists():
        try:
            cl.load_settings(SESSION_FILE)
            cl.login(username, password)
            print("Logged in using saved session")
            return cl
        except Exception as e:
            print(f"Session expired, logging in fresh: {e}")
    
    # Fresh login
    cl.login(username, password)
    cl.dump_settings(SESSION_FILE)
    print("Logged in and saved session")
    return cl

def post_photo(cl, image_path, caption):
    """Post a photo with caption"""
    media = cl.photo_upload(image_path, caption)
    print(f"Posted! Media ID: {media.pk}")
    print(f"URL: https://www.instagram.com/p/{media.code}/")
    return media

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python instagram_post.py <username> <password> <image_path> [caption]")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    image_path = sys.argv[3]
    caption = sys.argv[4] if len(sys.argv) > 4 else ""
    
    cl = login(username, password)
    post_photo(cl, image_path, caption)
