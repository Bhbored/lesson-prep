"""Run against a started OCR service: python smoke_test.py."""

from io import BytesIO
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import requests


def recognize(text: str, language: str) -> str:
    image = Image.new("RGB", (1100, 180), "white")
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 54)
    draw.text((25, 35), text, fill="black", font=font)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    response = requests.post("http://127.0.0.1:8001/api/ocr", files={"image": ("sample.png", buffer.getvalue(), "image/png")}, data={"language": language}, timeout=120)
    response.raise_for_status()
    return response.json()["text"]


if __name__ == "__main__":
    english = recognize("Photosynthesis uses sunlight", "en")
    arabic_image = Path(__file__).resolve().parents[1] / "PaddleOCR/docs/version2.x/ppocr/blog/images/arabic_0.jpg"
    response = requests.post("http://127.0.0.1:8001/api/ocr", files={"image": ("arabic.jpg", arabic_image.read_bytes(), "image/jpeg")}, data={"language": "ar"}, timeout=120)
    response.raise_for_status()
    arabic = response.json()["text"]
    print("English:", english)
    print("Arabic:", ascii(arabic))
    assert "Photosynthesis" in english
    assert any("\u0600" <= char <= "\u06ff" for char in arabic)
