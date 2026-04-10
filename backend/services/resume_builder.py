from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

from backend.schemas.resume_builder import ResumeData


def build_resume_pdf(data: ResumeData) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
    )

    styles = getSampleStyleSheet()

    name_style = ParagraphStyle(
        "Name",
        fontName="Helvetica-Bold",
        fontSize=16,
        alignment=TA_CENTER,
        spaceBefore=0,
        spaceAfter=3,
        leading=18,
    )
    contact_style = ParagraphStyle(
        "Contact",
        fontName="Helvetica",
        fontSize=9,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#444444"),
        spaceAfter=4,
    )
    section_header_style = ParagraphStyle(
        "SectionHeader",
        fontName="Helvetica-Bold",
        fontSize=11,
        spaceBefore=8,
        spaceAfter=2,
        textColor=colors.HexColor("#1a1a1a"),
    )
    job_title_style = ParagraphStyle(
        "JobTitle",
        fontName="Helvetica-Bold",
        fontSize=10,
        spaceAfter=1,
    )
    job_meta_style = ParagraphStyle(
        "JobMeta",
        fontName="Helvetica-Oblique",
        fontSize=9,
        textColor=colors.HexColor("#555555"),
        spaceAfter=3,
    )
    bullet_style = ParagraphStyle(
        "Bullet",
        fontName="Helvetica",
        fontSize=9.5,
        leftIndent=12,
        bulletIndent=0,
        spaceAfter=2,
        leading=13,
    )
    body_style = ParagraphStyle(
        "Body",
        fontName="Helvetica",
        fontSize=9.5,
        spaceAfter=3,
        leading=13,
    )

    story = []

    # --- Header ---
    story.append(Paragraph(data.contact.name, name_style))

    contact_parts = []
    if data.contact.email:
        contact_parts.append(data.contact.email)
    if data.contact.phone:
        contact_parts.append(data.contact.phone)
    if data.contact.location:
        contact_parts.append(data.contact.location)
    if data.contact.linkedin_url:
        contact_parts.append(data.contact.linkedin_url)
    if data.contact.website_url:
        contact_parts.append(data.contact.website_url)

    if contact_parts:
        story.append(Paragraph("  |  ".join(contact_parts), contact_style))

    story.append(HRFlowable(width="100%", thickness=1, color=colors.black, spaceAfter=4))

    # --- Summary ---
    if data.summary and data.summary.strip():
        story.append(Paragraph("SUMMARY", section_header_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc"), spaceAfter=4))
        story.append(Paragraph(data.summary.strip(), body_style))

    # --- Work Experience ---
    if data.work_experience:
        story.append(Paragraph("EXPERIENCE", section_header_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc"), spaceAfter=4))

        for job in data.work_experience:
            end = job.end_date or "Present"
            date_range = f"{job.start_date} – {end}" if job.start_date else end

            # Title left, date right
            title_date = Table(
                [[Paragraph(job.title, job_title_style), Paragraph(date_range, ParagraphStyle(
                    "DateRight",
                    fontName="Helvetica",
                    fontSize=9,
                    alignment=TA_RIGHT,
                    textColor=colors.HexColor("#555555"),
                ))]],
                colWidths=["75%", "25%"],
            )
            title_date.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]))
            story.append(title_date)

            meta_parts = [job.company] if job.company else []
            if job.location:
                meta_parts.append(job.location)
            if meta_parts:
                story.append(Paragraph(" · ".join(meta_parts), job_meta_style))

            for bullet in job.bullets:
                if bullet.strip():
                    story.append(Paragraph(f"• {bullet.strip()}", bullet_style))

            story.append(Spacer(1, 4))

    # --- Education ---
    if data.education:
        story.append(Paragraph("EDUCATION", section_header_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc"), spaceAfter=4))

        for edu in data.education:
            degree_line = edu.degree or ""
            if edu.field:
                degree_line = f"{degree_line}, {edu.field}" if degree_line else edu.field

            grad = edu.graduation_year or ""
            title_date = Table(
                [[Paragraph(degree_line, job_title_style), Paragraph(grad, ParagraphStyle(
                    "GradRight",
                    fontName="Helvetica",
                    fontSize=9,
                    alignment=TA_RIGHT,
                    textColor=colors.HexColor("#555555"),
                ))]],
                colWidths=["75%", "25%"],
            )
            title_date.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]))
            story.append(title_date)

            meta_parts = [edu.institution] if edu.institution else []
            if edu.gpa:
                meta_parts.append(f"GPA: {edu.gpa}")
            if meta_parts:
                story.append(Paragraph(" · ".join(meta_parts), job_meta_style))

            story.append(Spacer(1, 4))

    # --- Skills ---
    if data.skills:
        story.append(Paragraph("SKILLS", section_header_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc"), spaceAfter=4))
        story.append(Paragraph(", ".join(s for s in data.skills if s.strip()), body_style))

    doc.build(story)
    return buf.getvalue()
