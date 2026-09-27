"""OCR only: PDF rendering and lesson generation belong to the ASP.NET service."""

from contextlib import asynccontextmanager
from io import BytesIO
import asyncio

import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from paddleocr import PaddleOCR

engines: dict[str, PaddleOCR] = {}
locks: dict[str, asyncio.Lock] = {}
recognition_models = {
    "en": "en_PP-OCRv5_mobile_rec",
    "ar": "arabic_PP-OCRv5_mobile_rec",
    "fr": "latin_PP-OCRv5_mobile_rec",
}


@asynccontextmanager
async def lifespan(_: FastAPI):
    for language, recognition_model in recognition_models.items():
        engines[language] = PaddleOCR(
            text_detection_model_name="PP-OCRv5_mobile_det",
            text_recognition_model_name=recognition_model,
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
        )
        locks[language] = asyncio.Lock()
    yield
    engines.clear()
    locks.clear()


app = FastAPI(title="LessonPrep OCR", lifespan=lifespan)


@app.get("/health")
def health():
    return {"ready": len(engines) == len(recognition_models)}


@app.post("/api/ocr")
async def ocr(image: UploadFile = File(...), language: str = Form("en")):
    if language not in engines:
        raise HTTPException(status_code=400, detail="Unsupported OCR language")
    content = await image.read()
    if not content or len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be nonempty and under 15 MB")
    try:
        with Image.open(BytesIO(content)) as loaded:
            loaded.verify()
        with Image.open(BytesIO(content)) as loaded:
            if loaded.width * loaded.height > 30_000_000:
                raise HTTPException(status_code=413, detail="Image dimensions are too large")
            pixels = np.asarray(loaded.convert("RGB"))
    except (UnidentifiedImageError, ValueError, OSError):
        raise HTTPException(status_code=400, detail="Invalid image") from None
    try:
        async with locks[language]:
            results = await asyncio.to_thread(engines[language].predict, pixels)
        lines = []
        for result in results:
            data = result.json if hasattr(result, "json") else result
            if callable(data):
                data = data()
            data = data.get("res", data)
            texts = data.get("rec_texts", [])
            scores = data.get("rec_scores", [])
            for index, text in enumerate(texts):
                if text and text.strip():
                    lines.append({"text": text.strip(), "confidence": float(scores[index]) if index < len(scores) else None})
        return {"text": "\n".join(item["text"] for item in lines), "lines": lines}
    except Exception as exc:
        raise HTTPException(status_code=502, detail="OCR failed") from exc
