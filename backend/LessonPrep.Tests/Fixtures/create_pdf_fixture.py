"""Regenerate mixed.pdf with: pip install reportlab pillow; python create_pdf_fixture.py."""

from io import BytesIO
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

destination = Path(__file__).with_name("mixed.pdf")
image = Image.new("RGB", (800, 130), "white")
draw = ImageDraw.Draw(image)
font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 36)
draw.text((20, 34), "Scanned lesson page about water", font=font, fill="black")
buffer = BytesIO()
image.save(buffer, format="PNG")
buffer.seek(0)

pdf = canvas.Canvas(str(destination), pagesize=(612, 792))
pdf.setFont("Helvetica", 14)
pdf.drawString(40, 710, "Plants need sunlight and water to grow in the classroom garden.")
pdf.drawString(40, 680, "Students compare leaves and explain how light supports growth.")
pdf.showPage()
pdf.drawImage(ImageReader(buffer), 40, 590, width=520, height=85)
pdf.showPage()
pdf.save()
print(destination)
