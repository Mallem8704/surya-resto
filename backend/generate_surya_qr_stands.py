"""
Generate High-Resolution Printable Table Standee Cards (PDF) for Surya Family Restaurant Kadiri.
Includes Tables T1 to T12 with QR codes pointing to https://surya-resto.vercel.app/order?branch=1&table=T{i}
"""

import os
import sys
import qrcode
from reportlab.lib.pagesizes import A5
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER

def generate_pdf(output_path: str):
    # A5 size: 419.5 x 595.3 points
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A5,
        leftMargin=20,
        rightMargin=20,
        topMargin=20,
        bottomMargin=20,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'SuryaTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#9E2A2B'),
        alignment=TA_CENTER,
        spaceAfter=4,
    )

    tagline_style = ParagraphStyle(
        'SuryaTagline',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#540B0E'),
        alignment=TA_CENTER,
        spaceAfter=8,
    )

    table_badge_style = ParagraphStyle(
        'TableBadge',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#FFFDF9'),
        alignment=TA_CENTER,
    )

    inst_head_style = ParagraphStyle(
        'InstHead',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#9E2A2B'),
        alignment=TA_CENTER,
        spaceAfter=4,
    )

    inst_step_style = ParagraphStyle(
        'InstStep',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#331A15'),
        alignment=TA_CENTER,
    )

    footer_style = ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#6B5E59'),
        alignment=TA_CENTER,
    )

    elements = []
    temp_qr_files = []

    logo_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "logo.png")
    if not os.path.exists(logo_path):
        logo_path = None

    for i in range(1, 13):
        table_label = f"T{i}"
        qr_url = f"https://surya-resto.vercel.app/order?branch=1&table={table_label}"

        # 1. Generate QR Code image
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=2,
        )
        qr.add_data(qr_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#261612", back_color="#FFFDF9")

        qr_tmp_path = f"tmp_qr_{table_label}.png"
        img.save(qr_tmp_path)
        temp_qr_files.append(qr_tmp_path)

        # 2. Build Card Flowables
        elements.append(Spacer(1, 10))

        # Logo if available
        if logo_path and os.path.exists(logo_path):
            elements.append(RLImage(logo_path, width=54, height=54))
            elements.append(Spacer(1, 4))

        # Restaurant Brand Header
        elements.append(Paragraph("SURYA FAMILY RESTAURANT", title_style))
        elements.append(Paragraph("Dhandubatu Street, Bypass Road, Opp. RTC Bus Stand, Kadiri<br/>📞 +91 98803 58634 • Kadiri's Favorite Dining Destination", tagline_style))
        elements.append(Spacer(1, 6))

        # Table Badge Box (Styled Table)
        badge_p = Paragraph(f"★ TABLE {table_label} ★", table_badge_style)
        badge_table = Table([[badge_p]], colWidths=[360], rowHeights=[34])
        badge_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#D9531E')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('CORNERPAD', (0, 0), (-1, -1), 8),
        ]))
        elements.append(badge_table)
        elements.append(Spacer(1, 12))

        # QR Code in Border Box
        qr_img = RLImage(qr_tmp_path, width=190, height=190)
        qr_box = Table([[qr_img]], colWidths=[206], rowHeights=[206])
        qr_box.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFFDF9')),
            ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#E76F51')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(qr_box)
        elements.append(Spacer(1, 10))

        # Instruction Steps
        elements.append(Paragraph("SCAN TO ORDER FROM YOUR PHONE", inst_head_style))
        elements.append(Paragraph("1. Open Camera or Google Lens & Scan QR Code<br/>2. Browse Biryanis, Mandis, Punjabi Curries & Starters<br/>3. Tap 'Send to Kitchen' — Fresh Food Prepared for Your Table!", inst_step_style))
        elements.append(Spacer(1, 12))

        # Payment & Footer details
        footer_p = Paragraph("UPI (GPay / PhonePe / Paytm) • Cash • Card Accepted<br/>Direct Kitchen Display Connected • Instant Table Service", footer_style)
        elements.append(footer_p)

        if i < 12:
            from reportlab.platypus import PageBreak
            elements.append(PageBreak())

    # Build document
    doc.build(elements)

    # Clean up temp QR files
    for f in temp_qr_files:
        try:
            if os.path.exists(f):
                os.remove(f)
        except:
            pass

    print(f"Successfully generated 12-page Surya Table QR Stands PDF at: {output_path}")

if __name__ == "__main__":
    out_backend = os.path.join(os.path.dirname(__file__), "Surya_Table_QR_Stands.pdf")
    generate_pdf(out_backend)

    out_frontend = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "Surya_Table_QR_Stands.pdf")
    generate_pdf(out_frontend)
