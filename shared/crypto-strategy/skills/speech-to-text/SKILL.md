---
name: speech-to-text
description: Transcribe audio/voice messages to text using OpenAI Whisper API. Use when receiving voice messages in Telegram/WhatsApp, when user sends audio files for transcription, or when "transcribe this audio" is requested.
---

# Speech-to-Text (Local Whisper)

Transcribe voice messages and audio files to text using local whisper-cpp.

## Features

- ✅ FREE — runs locally, no API costs
- ✅ Fast — ~100ms on Apple Silicon
- ✅ Private — audio never leaves the machine
- ✅ German optimized — works great for DE

## Requirements

- whisper-cpp (`brew install whisper-cpp`)
- ffmpeg (`brew install ffmpeg`)
- Model file at `~/.local/share/whisper-cpp/ggml-base.bin`

## Quick Start

```bash
# Transcribe audio file (German default)
./scripts/stt /path/to/audio.ogg

# Specify language
./scripts/stt /path/to/audio.ogg en
```

## Supported Formats

- OGG/Opus (Telegram voice)
- MP3, MP4, M4A
- WAV, WEBM
- Any format ffmpeg can decode

## Model Download

If model is missing:
```bash
mkdir -p ~/.local/share/whisper-cpp
curl -L -o ~/.local/share/whisper-cpp/ggml-base.bin \
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin"
```

## Integration Pattern

When a voice message arrives:
1. Run `./scripts/stt <audio_path>` 
2. Use the transcript as message text
