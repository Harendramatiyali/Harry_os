"""Stage 2 — OCR engines."""

from __future__ import annotations

import io
import platform
import re
import sys
from pathlib import Path

from app.modules.ai.imports.pipeline.types import OcrPageResult, PipelineImage

_DATE_IN_NAME = re.compile(r"(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})")


def _score_transcript(text: str) -> float:
    if not text:
        return 0.05
    if text.startswith("[filename]"):
        return 0.2
    n = len(text)
    if n > 200:
        return 0.85
    if n > 80:
        return 0.72
    if n > 20:
        return 0.55
    return 0.35


def _looks_like_garbage(text: str) -> bool:
    """Heuristic: tesseract often returns short noise on handwriting."""
    cleaned = re.sub(r"\s+", " ", text).strip()
    if len(cleaned) < 25:
        return True
    letters = sum(c.isalpha() for c in cleaned)
    if letters < 15:
        return True
    # Too many single-char tokens → usually OCR noise
    tokens = cleaned.split()
    if tokens and (sum(1 for t in tokens if len(t) <= 1) / len(tokens)) > 0.45:
        return True
    return False


def _macos_vision_extract(path: str) -> tuple[str, float, dict]:
    """Use Apple Vision via ocrmac (best for handwritten notebook photos on Mac)."""
    from ocrmac import ocrmac  # type: ignore

    anns = ocrmac.OCR(path, recognition_level="accurate").recognize()
    lines: list[str] = []
    confs: list[float] = []
    for item in anns or []:
        if not item:
            continue
        text = str(item[0]).strip() if item[0] is not None else ""
        if not text:
            continue
        lines.append(text)
        try:
            confs.append(float(item[1]))
        except (TypeError, ValueError, IndexError):
            pass
    transcript = "\n".join(lines).strip()
    avg_conf = sum(confs) / len(confs) if confs else (0.7 if transcript else 0.1)
    # Mix Vision self-score with length-based score
    score = min(0.95, max(_score_transcript(transcript), avg_conf * 0.9))
    return transcript, score, {"annotations": len(lines), "avg_vision_conf": avg_conf}


def _preprocess_for_ocr(pil_image):
    """Prepare phone photos of notebook pages for Tesseract."""
    from PIL import Image, ImageEnhance, ImageOps  # type: ignore

    img = pil_image.convert("RGB")
    w, h = img.size
    long_edge = max(w, h)
    if long_edge < 1600:
        scale = 1600 / long_edge
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    elif long_edge > 3200:
        scale = 3200 / long_edge
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

    gray = ImageOps.exif_transpose(img).convert("L")
    gray = ImageOps.autocontrast(gray, cutoff=1)
    gray = ImageEnhance.Contrast(gray).enhance(1.6)
    gray = ImageEnhance.Sharpness(gray).enhance(1.4)
    return gray


def _tesseract_extract(pil_image) -> tuple[str, dict]:
    import pytesseract  # type: ignore

    meta: dict = {
        "image_mode": pil_image.mode,
        "image_size": list(pil_image.size),
    }
    prepared = _preprocess_for_ocr(pil_image)
    meta["ocr_size"] = list(prepared.size)

    candidates: list[tuple[str, str]] = []
    for psm in (6, 4, 3):
        config = f"--oem 3 --psm {psm}"
        text = pytesseract.image_to_string(prepared, config=config).strip()
        candidates.append((text, f"psm{psm}"))

    best_text, best_mode = max(candidates, key=lambda c: len(c[0]))
    meta["psm"] = best_mode
    meta["candidate_lengths"] = {mode: len(text) for text, mode in candidates}
    return best_text, meta


def _ensure_tesseract_cmd() -> None:
    import pytesseract  # type: ignore

    try:
        pytesseract.get_tesseract_version()
        return
    except Exception:
        pass
    for candidate in ("/opt/homebrew/bin/tesseract", "/usr/local/bin/tesseract"):
        if Path(candidate).is_file():
            pytesseract.pytesseract.tesseract_cmd = candidate
            return


class LocalOcrEngine:
    """Best-effort OCR for notebook page images.

    Order:
      1. Sidecar `.txt` next to image (dev / fixtures)
      2. macOS Vision via `ocrmac` (handwriting-friendly)
      3. pytesseract + Pillow
      4. Filename / empty fallback
    """

    name = "local_ocr_v1"

    async def extract(self, image: PipelineImage) -> OcrPageResult:
        warnings: list[str] = []
        meta: dict = {}

        # 1) Sidecar transcript
        if image.path is not None:
            sidecar = Path(image.path).with_suffix(".txt")
            if sidecar.is_file():
                text = sidecar.read_text(encoding="utf-8", errors="replace").strip()
                return OcrPageResult(
                    page_id=image.page_id,
                    page_index=image.page_index,
                    file_name=image.file_name,
                    transcript=text,
                    confidence=0.92 if text else 0.1,
                    engine=f"{self.name}:sidecar",
                    meta={"source": "sidecar"},
                )

        # 2) macOS Vision (ocrmac) — best on handwritten notebook photos
        if sys.platform == "darwin" and image.path and Path(image.path).is_file():
            try:
                text, conf, vision_meta = _macos_vision_extract(image.path)
                meta.update(vision_meta)
                if text and not _looks_like_garbage(text):
                    return OcrPageResult(
                        page_id=image.page_id,
                        page_index=image.page_index,
                        file_name=image.file_name,
                        transcript=text,
                        confidence=conf,
                        engine=f"{self.name}:macos_vision",
                        meta=meta,
                        warnings=warnings,
                    )
                if text:
                    warnings.append("macos Vision returned weak text — trying tesseract")
                    meta["vision_weak_text"] = text[:200]
                else:
                    warnings.append("macos Vision returned empty text — trying tesseract")
            except ImportError:
                warnings.append("ocrmac not installed — skipping macOS Vision OCR")
            except Exception as exc:  # noqa: BLE001
                warnings.append(f"macos Vision OCR failed: {exc}")

        data = image.load_bytes()

        # 3) pytesseract + Pillow
        try:
            from PIL import Image  # type: ignore

            _ensure_tesseract_cmd()
            pil = Image.open(io.BytesIO(data))
            text, tess_meta = _tesseract_extract(pil)
            meta.update(tess_meta)
            if text and not _looks_like_garbage(text):
                return OcrPageResult(
                    page_id=image.page_id,
                    page_index=image.page_index,
                    file_name=image.file_name,
                    transcript=text,
                    confidence=_score_transcript(text),
                    engine=f"{self.name}:tesseract",
                    meta=meta,
                    warnings=warnings,
                )
            if text:
                warnings.append("tesseract text looked like noise")
                # Still return it if we have nothing better and it's longer than filename fallback
                if len(text) > 40:
                    return OcrPageResult(
                        page_id=image.page_id,
                        page_index=image.page_index,
                        file_name=image.file_name,
                        transcript=text,
                        confidence=min(0.4, _score_transcript(text)),
                        engine=f"{self.name}:tesseract_weak",
                        meta=meta,
                        warnings=warnings,
                    )
            else:
                warnings.append("pytesseract returned empty text")
        except ImportError:
            warnings.append(
                "OCR engines pytesseract/Pillow not installed — using filename hints only"
            )
        except Exception as exc:  # noqa: BLE001 — OCR is best-effort
            warnings.append(f"tesseract failed: {exc}")

        # 4) Filename / empty fallback
        hints: list[str] = []
        if image.file_name:
            hints.append(f"[filename] {image.file_name}")
            m = _DATE_IN_NAME.search(image.file_name)
            if m:
                hints.append(f"Date: {m.group(1)}-{m.group(2)}-{m.group(3)}")
        transcript = "\n".join(hints).strip()
        return OcrPageResult(
            page_id=image.page_id,
            page_index=image.page_index,
            file_name=image.file_name,
            transcript=transcript,
            confidence=0.2 if transcript else 0.05,
            engine=f"{self.name}:fallback",
            meta={**meta, "platform": platform.system()},
            warnings=warnings,
        )


async def run_ocr(
    images: list[PipelineImage],
    *,
    engine: LocalOcrEngine | None = None,
) -> list[OcrPageResult]:
    ocr = engine or LocalOcrEngine()
    by_index = sorted(images, key=lambda i: i.page_index)
    return [await ocr.extract(image) for image in by_index]
