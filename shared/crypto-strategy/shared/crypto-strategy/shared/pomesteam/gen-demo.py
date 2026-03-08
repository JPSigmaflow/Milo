#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

OUT = "/Users/milo/.openclaw/workspace/shared/pomesteam/demo-frames"
W, H = 1280, 720

def font(size):
    try:
        return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size)
    except:
        return ImageFont.truetype("/System/Library/Fonts/SFNSMono.ttf", size)

def gradient_bg(draw, c1, c2):
    for y in range(H):
        r = int(c1[0] + (c2[0]-c1[0]) * y/H)
        g = int(c1[1] + (c2[1]-c1[1]) * y/H)
        b = int(c1[2] + (c2[2]-c1[2]) * y/H)
        draw.line([(0,y),(W,y)], fill=(r,g,b))

def dark_bg(draw):
    gradient_bg(draw, (15,15,25), (10,10,15))

def draw_rounded_rect(draw, xy, fill, radius=16):
    x0,y0,x1,y1 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill)

# --- SLIDE 1: Title ---
img = Image.new('RGB', (W,H))
d = ImageDraw.Draw(img)
gradient_bg(d, (255,69,0), (255,200,0))
d.text((W//2, 200), "🐾", font=font(80), anchor="mm", fill="white")
d.text((W//2, 310), "PomesTeam", font=font(90), anchor="mm", fill="white")
d.text((W//2, 400), "TikTok Content Posting Integration", font=font(32), anchor="mm", fill=(255,255,255,200))
d.text((W//2, 480), "Demo Video — App Review", font=font(28), anchor="mm", fill=(255,255,255,180))
img.save(f"{OUT}/slide1.png")

# --- SLIDE 2: About the App ---
img = Image.new('RGB', (W,H))
d = ImageDraw.Draw(img)
dark_bg(d)
d.text((W//2, 60), "About PomesTeam", font=font(48), anchor="mm", fill=(255,140,0))
draw_rounded_rect(d, (80, 110, 1200, 650), fill=(26,26,46))
lines = [
    ("Platform:", "Instagram + TikTok Cross-Posting"),
    ("Content:", "Pomeranian dog videos & photos"),
    ("Followers:", "940+ on Instagram, growing on TikTok"),
    ("Use Case:", "Auto-publish videos to TikTok via API"),
    ("API Scopes:", "video.upload + video.publish"),
    ("Category:", "Entertainment / Pets"),
]
y = 160
for label, val in lines:
    d.text((120, y), label, font=font(26), fill=(150,150,150))
    d.text((380, y), val, font=font(26), fill=(255,255,255))
    y += 70
img.save(f"{OUT}/slide2.png")

# --- SLIDE 3: Content Flow ---
img = Image.new('RGB', (W,H))
d = ImageDraw.Draw(img)
dark_bg(d)
d.text((W//2, 60), "Content Publishing Flow", font=font(48), anchor="mm", fill=(255,140,0))

steps = [
    ("📸", "Create\nContent", 130),
    ("→", None, 280),
    ("📱", "Instagram\nPost", 350),
    ("→", None, 500),
    ("🤖", "Auto-Detect\nNew Post", 570),
    ("→", None, 720),
    ("🎬", "TikTok API\nUpload", 790),
    ("→", None, 940),
    ("✅", "Published\non TikTok", 1010),
]
for icon, label, x in steps:
    if label:
        draw_rounded_rect(d, (x-60, 220, x+130, 440), fill=(26,26,46))
        d.text((x+35, 280), icon, font=font(48), anchor="mm")
        for i, line in enumerate(label.split('\n')):
            d.text((x+35, 350+i*30), line, font=font(20), anchor="mm", fill=(200,200,200))
    else:
        d.text((x, 330), "→", font=font(40), anchor="mm", fill=(255,140,0))

# Bottom note
draw_rounded_rect(d, (80, 500, 1200, 660), fill=(26,26,46))
d.text((640, 540), "API Integration Details", font=font(28), anchor="mm", fill=(255,140,0))
d.text((640, 585), "POST /v2/post/publish/ — Upload video with caption & hashtags", font=font(22), anchor="mm", fill=(180,180,180))
d.text((640, 620), "Scopes: video.upload, video.publish | Auth: OAuth 2.0", font=font(22), anchor="mm", fill=(180,180,180))
img.save(f"{OUT}/slide3.png")

# --- SLIDE 4: Code Example ---
img = Image.new('RGB', (W,H))
d = ImageDraw.Draw(img)
dark_bg(d)
d.text((W//2, 50), "API Code — Video Upload", font=font(42), anchor="mm", fill=(255,140,0))

draw_rounded_rect(d, (40, 90, 1240, 680), fill=(30,30,46))

code_lines = [
    ("# TikTok Content Posting API Integration", (106,153,85)),
    ("", None),
    ("import requests", (86,156,214)),
    ("", None),
    ("# Step 1: Initialize video upload", (106,153,85)),
    ('url = "https://open.tiktokapis.com/v2/post/publish/"', (206,145,120)),
    ("", None),
    ("headers = {", (255,255,255)),
    ('    "Authorization": f"Bearer {access_token}",', (206,145,120)),
    ('    "Content-Type": "application/json"', (206,145,120)),
    ("}", (255,255,255)),
    ("", None),
    ("# Step 2: Publish video with caption", (106,153,85)),
    ("payload = {", (255,255,255)),
    ('    "post_info": {', (255,255,255)),
    ('        "title": "Cute Poms playing! 🐾 #pomeranian",', (206,145,120)),
    ('        "privacy_level": "PUBLIC_TO_EVERYONE"', (206,145,120)),
    ('    },', (255,255,255)),
    ('    "source_info": {', (255,255,255)),
    ('        "source": "PULL_FROM_URL",', (206,145,120)),
    ('        "video_url": video_url', (206,145,120)),
    ('    }', (255,255,255)),
    ("}", (255,255,255)),
    ("", None),
    ("response = requests.post(url, headers=headers, json=payload)", (255,255,255)),
]

try:
    codefont = ImageFont.truetype("/System/Library/Fonts/SFNSMono.ttf", 18)
except:
    codefont = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 18)

y = 110
for line, color in code_lines:
    if color:
        d.text((70, y), line, font=codefont, fill=color)
    y += 23
img.save(f"{OUT}/slide4.png")

# --- SLIDE 5: Scopes ---
img = Image.new('RGB', (W,H))
d = ImageDraw.Draw(img)
dark_bg(d)
d.text((W//2, 60), "Requested Scopes", font=font(48), anchor="mm", fill=(255,140,0))

scopes = [
    ("video.upload", "Upload video files to TikTok servers", "Required to transfer video content via API"),
    ("video.publish", "Publish uploaded videos to user's TikTok", "Required to make videos visible on the profile"),
]
y = 150
for scope, desc, detail in scopes:
    draw_rounded_rect(d, (80, y, 1200, y+150), fill=(26,26,46))
    d.text((120, y+25), f"✅  {scope}", font=font(32), fill=(100,255,100))
    d.text((120, y+70), desc, font=font(24), fill=(220,220,220))
    d.text((120, y+105), detail, font=font(20), fill=(150,150,150))
    y += 180

draw_rounded_rect(d, (80, 530, 1200, 660), fill=(26,26,46))
d.text((640, 565), "No additional scopes required", font=font(26), anchor="mm", fill=(180,180,180))
d.text((640, 610), "PomesTeam only needs content posting capabilities", font=font(22), anchor="mm", fill=(130,130,130))
img.save(f"{OUT}/slide5.png")

# --- SLIDE 6: Thank You ---
img = Image.new('RGB', (W,H))
d = ImageDraw.Draw(img)
gradient_bg(d, (255,69,0), (255,200,0))
d.text((W//2, 250), "🐾 PomesTeam", font=font(72), anchor="mm", fill="white")
d.text((W//2, 340), "Thank you for reviewing our application", font=font(30), anchor="mm", fill=(255,255,255,220))
d.text((W//2, 420), "instagram.com/pomesteam", font=font(26), anchor="mm", fill=(255,255,255,180))
d.text((W//2, 460), "tiktok.com/@pomesteam", font=font(26), anchor="mm", fill=(255,255,255,180))
img.save(f"{OUT}/slide6.png")

print("All 6 slides generated!")
