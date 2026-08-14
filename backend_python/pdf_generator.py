import os
import time
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

def generate_diagnostic_pdf(report_data: dict) -> str:
    """
    Generates a beautifully styled, professional PDF report from diagnosis results.
    Saves the PDF inside the uploads directory.
    Returns: The absolute path to the generated PDF.
    """
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"report_{int(time.time())}.pdf"
    pdf_path = os.path.join(UPLOAD_DIR, filename)

    # 1. Setup Document
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
    )
    
    # 2. Setup Styles
    styles = getSampleStyleSheet()
    
    # Primary Palette
    PRIMARY_COLOR = colors.HexColor("#15803d")   # Forest Green
    ACCENT_COLOR = colors.HexColor("#0d9488")    # Teal
    TEXT_DARK = colors.HexColor("#1f2937")       # Charcoal
    BG_LIGHT = colors.HexColor("#f9fafb")        # Soft grey
    
    # Alert Styles based on Severity
    severity = str(report_data.get("severity", "medium")).lower()
    if severity == "high":
        severity_color = colors.HexColor("#dc2626") # Red
        severity_bg = colors.HexColor("#fee2e2")
    elif severity == "medium":
        severity_color = colors.HexColor("#d97706") # Amber
        severity_bg = colors.HexColor("#fef3c7")
    else:
        severity_color = colors.HexColor("#16a34a") # Green
        severity_bg = colors.HexColor("#dcfce7")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=PRIMARY_COLOR,
        alignment=TA_LEFT,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor("#6b7280"),
        spaceAfter=15
    )

    section_header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=PRIMARY_COLOR,
        spaceBefore=12,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=TEXT_DARK,
        leading=14,
        spaceAfter=8
    )

    label_style = ParagraphStyle(
        'LabelText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        textColor=colors.HexColor("#374151")
    )

    meta_val_style = ParagraphStyle(
        'MetaValue',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=TEXT_DARK
    )
    
    badge_style = ParagraphStyle(
        'SeverityBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        textColor=severity_color,
        alignment=TA_CENTER
    )

    story = []

    # --- Header ---
    story.append(Paragraph("Smart Kisan AI Platform", title_style))
    story.append(Paragraph("OFFICIAL AGRICULTURAL DIAGNOSTICS & REMEDIES REPORT", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY_COLOR, spaceBefore=0, spaceAfter=15))

    # --- Metadata Table ---
    confidence_pct = f"{int(float(report_data.get('confidence', 0.95)) * 100)}%"
    
    meta_data = [
        [
            Paragraph("Crop Name:", label_style), 
            Paragraph(report_data.get("crop_name") or report_data.get("crop") or "Unknown Crop", meta_val_style),
            Paragraph("Severity Level:", label_style),
            Paragraph(f"<b>{severity.upper()}</b>", badge_style)
        ],
        [
            Paragraph("Condition/Disease:", label_style),
            Paragraph(report_data.get("disease_name") or report_data.get("disease") or "Healthy", meta_val_style),
            Paragraph("AI Model Confidence:", label_style),
            Paragraph(confidence_pct, meta_val_style)
        ],
        [
            Paragraph("Diagnostic Region:", label_style),
            Paragraph(report_data.get("region") or "India", meta_val_style),
            Paragraph("Report Date:", label_style),
            Paragraph(time.strftime("%d %b %Y, %I:%M %p"), meta_val_style)
        ]
    ]

    meta_table = Table(meta_data, colWidths=[110, 150, 120, 120])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ('BACKGROUND', (3, 0), (3, 0), severity_bg), # Color severity cell
    ]))
    
    story.append(meta_table)
    story.append(Spacer(1, 15))

    # --- Section: Symptoms & Causes ---
    story.append(Paragraph("Clinical Analysis & Symptoms", section_header_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb"), spaceAfter=8))
    symptoms_text = report_data.get("problems_detected") or report_data.get("disease_description") or report_data.get("symptoms") or "No symptoms specified."
    story.append(Paragraph(symptoms_text, body_style))
    
    causes_text = report_data.get("causes") or "No environmental favorability or pathogen information specified."
    story.append(Paragraph("<b>Pathogen/Cause Details:</b>", label_style))
    story.append(Paragraph(causes_text, body_style))
    story.append(Spacer(1, 10))

    # --- Section: Remedies & Prescriptions ---
    story.append(Paragraph("Agronomic Remedies & Treatment Plan", section_header_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb"), spaceAfter=8))
    
    organic_sol = report_data.get("organic_treatment") or report_data.get("treatment") or "N/A"
    chemical_sol = report_data.get("chemical_treatment") or report_data.get("treatment") or "N/A"
    prevention = report_data.get("prevention_methods") or report_data.get("prevention") or "N/A"
    
    remedy_data = [
        [Paragraph("<b>Organic Remedy:</b>", label_style), Paragraph(organic_sol, body_style)],
        [Paragraph("<b>Chemical Remedy:</b>", label_style), Paragraph(chemical_sol, body_style)],
        [Paragraph("<b>Sanitation/Prevention:</b>", label_style), Paragraph(prevention, body_style)]
    ]
    
    remedy_table = Table(remedy_data, colWidths=[130, 370])
    remedy_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor("#f3f4f6")),
    ]))
    
    story.append(remedy_table)
    story.append(Spacer(1, 10))

    # --- Section: Fertilizer & Irrigation Advice ---
    fertilizer_advice = report_data.get("fertilizer_recommendation") or report_data.get("suggested_fertilizers") or report_data.get("fertilizer_advice")
    irrigation_advice = report_data.get("irrigation_advice")
    
    if fertilizer_advice or irrigation_advice:
        story.append(Paragraph("Advisory: Soil Nutrition & Water Management", section_header_style))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb"), spaceAfter=8))
        
        advice_data = []
        if fertilizer_advice:
            advice_data.append([Paragraph("<b>Fertilizer Advice:</b>", label_style), Paragraph(fertilizer_advice, body_style)])
        if irrigation_advice:
            advice_data.append([Paragraph("<b>Irrigation Advice:</b>", label_style), Paragraph(irrigation_advice, body_style)])
            
        advice_table = Table(advice_data, colWidths=[130, 370])
        advice_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor("#f3f4f6")),
        ]))
        story.append(advice_table)
        story.append(Spacer(1, 10))

    # --- Footer Notice ---
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY_COLOR, spaceBefore=20, spaceAfter=8))
    footer_text = ParagraphStyle(
        'FooterNotice',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        textColor=colors.HexColor("#9ca3af"),
        alignment=TA_CENTER
    )
    story.append(Paragraph("Disclaimer: This diagnosis report is generated using AI models. Farmers are advised to consult local KVK experts before deploying extensive chemicals.", footer_text))

    # Build PDF
    doc.build(story)
    return pdf_path
