#!/usr/bin/env python3
"""
Kaleriia Studio — Corporate Headshot Agreement PDF Generator
Usage: python generate_agreement.py --client-name "..." --company "..." --event-date "..." --location "..."
"""

import argparse
import os
import re
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)

# ── Design Tokens ────────────────────────────────────────────────────────────
DARK = HexColor("#1a1a2e")
ACCENT = HexColor("#c9a96e")
LIGHT_BG = HexColor("#f8f6f3")
MID_GRAY = HexColor("#6b7280")
LIGHT_LINE = HexColor("#e5e1dc")
WHITE = white

PAGE_W, PAGE_H = letter
LEFT_M = 54
RIGHT_M = 54
TOP_M = 44
BOT_M = 50


# ── Page Template ────────────────────────────────────────────────────────────
def draw_header(c, doc):
    c.setFillColor(DARK)
    c.rect(0, PAGE_H - 6, PAGE_W, 6, fill=1, stroke=0)
    c.setFillColor(ACCENT)
    c.rect(0, PAGE_H - 8, PAGE_W, 2, fill=1, stroke=0)


def draw_footer(c, doc):
    c.setStrokeColor(LIGHT_LINE)
    c.setLineWidth(0.5)
    c.line(LEFT_M, 40, PAGE_W - RIGHT_M, 40)
    c.setFont("Helvetica", 7.5)
    c.setFillColor(MID_GRAY)
    c.drawString(LEFT_M, 28, "Kaleriia Studio  ·  Professional Photography Agreement")
    c.drawRightString(PAGE_W - RIGHT_M, 28, f"Page {doc.page}")


def on_page(c, doc):
    draw_header(c, doc)
    draw_footer(c, doc)


# ── Styles ───────────────────────────────────────────────────────────────────
def get_styles():
    body_color = HexColor("#374151")
    return {
        "studio": ParagraphStyle(
            "Studio", fontName="Helvetica", fontSize=10,
            textColor=ACCENT, letterSpacing=4, alignment=TA_CENTER, spaceAfter=1
        ),
        "byline": ParagraphStyle(
            "ByLine", fontName="Helvetica-Oblique", fontSize=8.5,
            textColor=MID_GRAY, alignment=TA_CENTER, spaceAfter=10
        ),
        "title": ParagraphStyle(
            "Title", fontName="Helvetica-Bold", fontSize=18,
            textColor=DARK, alignment=TA_CENTER, spaceAfter=3, leading=23
        ),
        "subtitle": ParagraphStyle(
            "Subtitle", fontName="Helvetica", fontSize=8.5,
            textColor=MID_GRAY, alignment=TA_CENTER, spaceAfter=14
        ),
        "intro": ParagraphStyle(
            "Intro", fontName="Helvetica", fontSize=9,
            textColor=body_color, leading=13, spaceAfter=12
        ),
        "section": ParagraphStyle(
            "Section", fontName="Helvetica-Bold", fontSize=10,
            textColor=DARK, spaceBefore=12, spaceAfter=5
        ),
        "body": ParagraphStyle(
            "Body", fontName="Helvetica", fontSize=9,
            textColor=body_color, leading=13, spaceAfter=4
        ),
        "bullet": ParagraphStyle(
            "Bullet", fontName="Helvetica", fontSize=9,
            textColor=body_color, leading=13, spaceAfter=2,
            leftIndent=16, bulletIndent=5
        ),
        "body_right": ParagraphStyle(
            "BodyRight", fontName="Helvetica", fontSize=9,
            textColor=body_color, leading=13, spaceAfter=4, alignment=TA_RIGHT
        ),
        "sig_name": ParagraphStyle(
            "SigName", fontName="Helvetica-Bold", fontSize=10,
            textColor=DARK, spaceAfter=2
        ),
    }


# ── Table Helpers ────────────────────────────────────────────────────────────
def light_table_style():
    return TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, LIGHT_LINE),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ])


# ── Build PDF ────────────────────────────────────────────────────────────────
def build_agreement(cfg: dict, output_path: str):
    doc = SimpleDocTemplate(
        output_path, pagesize=letter,
        leftMargin=LEFT_M, rightMargin=RIGHT_M,
        topMargin=TOP_M + 20, bottomMargin=BOT_M,
    )
    s = get_styles()
    story = []

    total = cfg["minimum_fee"] + cfg["transport_fee"]

    # ── Header ───────────────────────────────────────────────────────────
    story.append(Spacer(1, 6))
    story.append(Paragraph("KALERIIA STUDIO", s["studio"]))
    story.append(Paragraph("by Valeriia Moskaliuk", s["byline"]))
    story.append(HRFlowable(width="30%", thickness=1, color=ACCENT,
                             spaceAfter=10, hAlign='CENTER'))
    svc_type = cfg.get("service_type", "Corporate Headshot")
    story.append(Paragraph(f"{svc_type}<br/>Photography Agreement", s["title"]))
    story.append(Paragraph("Professional Photography Services Contract", s["subtitle"]))

    # ── Intro ────────────────────────────────────────────────────────────
    story.append(Paragraph(
        'This Photography Services Agreement ("Agreement") is entered into by and between '
        '<b>KALERIIA STUDIO by Valeriia Moskaliuk</b>, a sole proprietorship ("Photographer"), '
        'and the undersigned Client.', s["intro"]))

    # ── Event Details ────────────────────────────────────────────────────
    story.append(Paragraph("EVENT DETAILS", s["section"]))
    detail_data = [
        [Paragraph("<b>Event Date</b>", s["body"]),
         Paragraph(cfg["event_date"], s["body"])],
        [Paragraph("<b>Service Time</b>", s["body"]),
         Paragraph(f'{cfg["start_time"]} – {cfg["end_time"]}', s["body"])],
        [Paragraph("<b>Location</b>", s["body"]),
         Paragraph(cfg["location"], s["body"])],
    ]
    t = Table(detail_data, colWidths=[1.6 * inch, 4.2 * inch])
    t.setStyle(light_table_style())
    story.append(t)
    story.append(Spacer(1, 3))

    # ── Scope of Services ────────────────────────────────────────────────
    story.append(Paragraph("SCOPE OF SERVICES", s["section"]))
    if svc_type == "Corporate Headshot":
        story.append(Paragraph(
            "Photographer agrees to provide professional corporate headshot photography services "
            "during the scheduled time. Each participant will receive one (1) professionally edited "
            "headshot including basic professional retouching (color correction, exposure adjustment, "
            "minor blemish removal).", s["body"]))
    else:
        story.append(Paragraph(
            "Photographer agrees to provide professional event photography services "
            "during the scheduled time, including candid and posed photography of attendees "
            "and event highlights. Final images will include professional retouching "
            "(color correction, exposure adjustment, minor blemish removal).", s["body"]))

    rate_data = []
    if cfg["rate_per_person"] > 0:
        original_rate = cfg.get("original_rate", 0)
        if original_rate > 0:
            rate_data.append(
                [Paragraph("<b>Standard Rate</b>", s["body"]),
                 Paragraph(f'<strike>${original_rate}</strike> per participant', s["body"])])
            rate_data.append(
                [Paragraph("<b>Discounted Rate</b>", s["body"]),
                 Paragraph(f'<b>${cfg["rate_per_person"]}</b> per participant', s["body"])])
        else:
            rate_data.append(
                [Paragraph("<b>Rate</b>", s["body"]),
                 Paragraph(f'${cfg["rate_per_person"]} per participant', s["body"])])
    rate_data.append(
        [Paragraph("<b>Minimum Booking Guarantee</b>", s["body"]),
         Paragraph(f'${cfg["minimum_fee"]:,} (applies regardless of final attendance count)', s["body"])])
    t = Table(rate_data, colWidths=[2.2 * inch, 3.6 * inch])
    t.setStyle(light_table_style())
    story.append(Spacer(1, 2))
    story.append(t)

    # ── Equipment ────────────────────────────────────────────────────────
    story.append(Paragraph("EQUIPMENT TRANSPORTATION & SETUP", s["section"]))
    story.append(Paragraph(
        f'Client agrees to pay an additional <b>${cfg["transport_fee"]}</b> transportation and '
        'setup fee for professional lighting equipment and backdrop installation.', s["body"]))

    # ── Total Investment ─────────────────────────────────────────────────
    story.append(Paragraph("TOTAL INVESTMENT", s["section"]))

    s_bold = ParagraphStyle("BB", parent=s["body"], fontName="Helvetica-Bold")
    s_total_l = ParagraphStyle("TL", parent=s["body"], fontName="Helvetica-Bold",
                                textColor=WHITE)
    s_total_r = ParagraphStyle("TR", parent=s["body"], fontName="Helvetica-Bold",
                                alignment=TA_RIGHT, fontSize=11, textColor=WHITE)

    inv_data = [
        [Paragraph("Minimum Photography Fee", s["body"]),
         Paragraph(f'<b>${cfg["minimum_fee"]:,}</b>', s["body_right"])],
        [Paragraph("Transportation & Setup Fee", s["body"]),
         Paragraph(f'<b>${cfg["transport_fee"]}</b>', s["body_right"])],
        [Paragraph("<b>Total Minimum Contract Amount</b>", s_total_l),
         Paragraph(f'<b>${total:,}</b>', s_total_r)],
    ]
    t = Table(inv_data, colWidths=[3.6 * inch, 2.2 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 1), LIGHT_BG),
        ('BACKGROUND', (0, 2), (-1, 2), DARK),
        ('TEXTCOLOR', (0, 2), (0, 2), WHITE),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('LINEBELOW', (0, 0), (-1, 1), 0.5, LIGHT_LINE),
    ]))
    story.append(Spacer(1, 2))
    story.append(t)

    # ── Payment Terms ────────────────────────────────────────────────────
    story.append(Paragraph("STRIPE PAYMENT TERMS", s["section"]))
    story.append(Paragraph(
        "All payments shall be processed via secure Stripe payment link provided by Photographer.",
        s["body"]))
    if cfg.get("full_payment"):
        for b in [
            "Full payment of the total contract amount is required to secure the event date.",
            "Payment must be completed prior to the event.",
            "Full payment must be completed prior to delivery of edited images.",
        ]:
            story.append(Paragraph(f"•&nbsp;&nbsp;{b}", s["bullet"]))
    else:
        for b in [
            "A 50% non-refundable retainer is required to secure the event date.",
            "The remaining 50% balance is due on or before the event date.",
            "Full payment must be completed prior to delivery of edited images.",
        ]:
            story.append(Paragraph(f"•&nbsp;&nbsp;{b}", s["bullet"]))

    # ── Image Delivery ───────────────────────────────────────────────────
    story.append(Paragraph("IMAGE SELECTION & DELIVERY", s["section"]))
    for b in [
        "Each participant will select one image for professional editing.",
        f'Final edited images will be delivered via digital download within {cfg["delivery_days"]} business days following the event.',
        "Additional edited images may be purchased at an additional fee.",
    ]:
        story.append(Paragraph(f"•&nbsp;&nbsp;{b}", s["bullet"]))

    # ── Overtime ─────────────────────────────────────────────────────────
    if cfg["overtime_rate"] > 0:
        story.append(Paragraph("OVERTIME", s["section"]))
        story.append(Paragraph(
            f'Services extending beyond {cfg["end_time"]} will be billed at '
            f'<b>${cfg["overtime_rate"]} per additional hour</b>, subject to availability.',
            s["body"]))

    # ── Cancellation ─────────────────────────────────────────────────────
    story.append(Paragraph("CANCELLATION & RESCHEDULING", s["section"]))
    if cfg.get("full_payment"):
        for b in [
            "Payment is non-refundable.",
            "One rescheduling request is permitted with a minimum of 7 days written notice.",
        ]:
            story.append(Paragraph(f"•&nbsp;&nbsp;{b}", s["bullet"]))
    else:
        for b in [
            "The retainer is non-refundable.",
            "One rescheduling request is permitted with a minimum of 7 days written notice.",
        ]:
            story.append(Paragraph(f"•&nbsp;&nbsp;{b}", s["bullet"]))

    # ── Copyright ────────────────────────────────────────────────────────
    story.append(Paragraph("COPYRIGHT & USAGE RIGHTS", s["section"]))
    for b in [
        "Photographer retains full copyright ownership of all images created.",
        "Client and individual participants are granted full personal and professional usage rights without expiration.",
        "Photographer reserves the right to use images for portfolio, website, social media, editorial, and marketing purposes.",
    ]:
        story.append(Paragraph(f"•&nbsp;&nbsp;{b}", s["bullet"]))

    # ── Liability ────────────────────────────────────────────────────────
    story.append(Paragraph("LIMITATION OF LIABILITY", s["section"]))
    story.append(Paragraph(
        "Photographer shall not be liable for delays, venue restrictions, participant lateness, "
        "acts of God, or circumstances beyond reasonable control.", s["body"]))

    # ── Governing Law ────────────────────────────────────────────────────
    story.append(Paragraph("GOVERNING LAW", s["section"]))
    story.append(Paragraph(
        "This Agreement shall be governed by the laws of the State of South Carolina.",
        s["body"]))

    # ── Signatures ───────────────────────────────────────────────────────
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=ACCENT, spaceAfter=14))

    line = "___________________________________"
    s_h = ParagraphStyle("SH", parent=s["body"], fontName="Helvetica-Bold",
                          fontSize=8, textColor=MID_GRAY)
    s_it = ParagraphStyle("SIt", parent=s["body"], fontName="Helvetica-Oblique")

    sig_data = [
        [Paragraph("<b>CLIENT</b>", s_h), Paragraph("", s["body"]),
         Paragraph("<b>PHOTOGRAPHER</b>", s_h)],
        [Paragraph("", s["body"]), Paragraph("", s["body"]), Paragraph("", s["body"])],
        [Paragraph(f"Name: {line}", s["body"]), Paragraph("", s["body"]),
         Paragraph("KALERIIA STUDIO", s["sig_name"])],
        [Paragraph(f"Company: {line}", s["body"]), Paragraph("", s["body"]),
         Paragraph("by Valeriia Moskaliuk", s_it)],
        [Paragraph("", s["body"]), Paragraph("", s["body"]), Paragraph("", s["body"])],
        [Paragraph(f"Signature: {line}", s["body"]), Paragraph("", s["body"]),
         Paragraph(f"Signature: {line}", s["body"])],
        [Paragraph(f"Date: {line}", s["body"]), Paragraph("", s["body"]),
         Paragraph(f"Date: {line}", s["body"])],
    ]
    t = Table(sig_data, colWidths=[2.6 * inch, 0.4 * inch, 2.6 * inch])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(t)

    # ── Build ────────────────────────────────────────────────────────────
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f"✅ Agreement saved: {output_path}")


# ── CLI ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Kaleriia Studio — Corporate Headshot Agreement Generator"
    )
    parser.add_argument("--client-name", required=True, help="Client contact name")
    parser.add_argument("--company", required=True, help="Company name")
    parser.add_argument("--event-date", required=True, help='Event date, e.g. "March 28, 2026"')
    parser.add_argument("--location", required=True, help="Shooting location")
    parser.add_argument("--start-time", default="9:00 AM", help="Start time (default: 9:00 AM)")
    parser.add_argument("--end-time", default="11:00 AM", help="End time (default: 11:00 AM)")
    parser.add_argument("--rate", type=int, default=50, help="Rate per participant (default: 50)")
    parser.add_argument("--original-rate", type=int, default=0, help="Original rate before discount (0=no discount)")
    parser.add_argument("--minimum-fee", type=int, default=1500, help="Minimum fee (default: 1500)")
    parser.add_argument("--transport-fee", type=int, default=200, help="Transport fee (default: 200)")
    parser.add_argument("--overtime-rate", type=int, default=150, help="Overtime per hour (default: 150)")
    parser.add_argument("--delivery-days", default="7–10", help="Delivery days (default: 7–10)")
    parser.add_argument("--service-type", default="Corporate Headshot", help="Service type (default: Corporate Headshot)")
    parser.add_argument("--full-payment", action="store_true", help="Require full payment upfront (no 50%% retainer)")
    parser.add_argument("--output", default=None, help="Output path (auto-generated if omitted)")

    args = parser.parse_args()

    cfg = {
        "client_name": args.client_name,
        "company": args.company,
        "event_date": args.event_date,
        "location": args.location,
        "start_time": args.start_time,
        "end_time": args.end_time,
        "rate_per_person": args.rate,
        "original_rate": args.original_rate,
        "minimum_fee": args.minimum_fee,
        "transport_fee": args.transport_fee,
        "overtime_rate": args.overtime_rate,
        "delivery_days": args.delivery_days,
        "service_type": args.service_type,
        "full_payment": args.full_payment,
    }

    # Auto-generate filename
    if args.output:
        output_path = args.output
    else:
        os.makedirs("output", exist_ok=True)
        safe_company = re.sub(r'[^a-zA-Z0-9]', '_', args.company)
        date_str = datetime.now().strftime("%Y-%m-%d")
        output_path = f"output/Agreement_{safe_company}_{date_str}.pdf"

    build_agreement(cfg, output_path)


if __name__ == "__main__":
    main()
