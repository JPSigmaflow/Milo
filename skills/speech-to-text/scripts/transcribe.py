#!/usr/bin/env python3
"""
Transcribe audio files using OpenAI Whisper API.
Supports: ogg, mp3, mp4, m4a, wav, webm (max 25MB)
"""

import argparse
import json
import os
import sys
from pathlib import Path

def transcribe(audio_path: str, language: str = None) -> dict:
    """Transcribe audio file using OpenAI Whisper API."""
    try:
        from openai import OpenAI
    except ImportError:
        print("Error: openai package not installed. Run: pip install openai", file=sys.stderr)
        sys.exit(1)
    
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)
    
    client = OpenAI(api_key=api_key)
    
    audio_file = Path(audio_path)
    if not audio_file.exists():
        print(f"Error: File not found: {audio_path}", file=sys.stderr)
        sys.exit(1)
    
    # Check file size (max 25MB)
    file_size = audio_file.stat().st_size
    if file_size > 25 * 1024 * 1024:
        print(f"Error: File too large ({file_size / 1024 / 1024:.1f}MB). Max 25MB.", file=sys.stderr)
        sys.exit(1)
    
    with open(audio_file, "rb") as f:
        kwargs = {"model": "whisper-1", "file": f}
        if language:
            kwargs["language"] = language
        
        response = client.audio.transcriptions.create(**kwargs)
    
    return {
        "text": response.text,
        "file": str(audio_file),
        "language": language or "auto"
    }


def main():
    parser = argparse.ArgumentParser(description="Transcribe audio using Whisper API")
    parser.add_argument("audio_file", help="Path to audio file")
    parser.add_argument("--language", "-l", help="Language hint (e.g., de, en, fr)")
    parser.add_argument("--json", "-j", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    result = transcribe(args.audio_file, args.language)
    
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(result["text"])


if __name__ == "__main__":
    main()
