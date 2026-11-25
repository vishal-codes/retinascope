import base64
import os
from io import BytesIO
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from main import app, MAX_FILE
from inference import CLASS_NAMES


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as client:
        yield client


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


@pytest.mark.parametrize("mime,data,status", [
    ("image/jpeg", b"broken", 400),
    ("text/plain", b"broken", 415),
    ("image/png", bytes(MAX_FILE + 1), 413),
])
def test_reject_upload(client, mime, data, status):
    response = client.post("/predict", files={"file": ("sample", data, mime)})
    assert response.status_code == status
    assert isinstance(response.json()["detail"], str)


def test_prediction(client):
    image = BytesIO()
    Image.new("RGB", (120, 90), (80, 20, 5)).save(image, "PNG")
    response = client.post("/predict", files={"file": ("sample", image.getvalue(), "image/png")})
    assert response.status_code == 200
    result = response.json()
    probs = result["probabilities"]
    assert set(probs) == set(CLASS_NAMES)
    assert sum(probs.values()) == pytest.approx(1)
    assert result["grade"] == max(probs, key=probs.get)
    assert result["confidence"] == probs[result["grade"]]
    overlay = Image.open(BytesIO(base64.b64decode(result["gradcam_overlay"])))
    assert overlay.format == "PNG" and overlay.size == (120, 90)


def test_held_out_grades(client):
    directory = os.environ.get("HELD_OUT_DIR")
    if not directory:
        pytest.skip("Set HELD_OUT_DIR to non-identifying images organized by expected class.")
    images = [p for p in Path(directory).glob("*/*") if p.suffix.lower() in {".png", ".jpg", ".jpeg"}]
    assert images, "No held-out images found"
    for path in images:
        mime = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
        response = client.post("/predict", files={"file": ("sample", path.read_bytes(), mime)})
        assert response.status_code == 200
        assert response.json()["grade"] == path.parent.name


def test_preprocessing_and_overlay_alignment():
    import numpy as np
    import torch

    from gradcam import make_overlay
    from inference import preprocess_image

    pixels = np.zeros((120, 180, 3), dtype=np.uint8)
    pixels[20:100, 50:135] = (190, 60, 50)
    image = BytesIO()
    Image.fromarray(pixels).save(image, "PNG")
    tensor, original, bounds = preprocess_image(image.getvalue(), "image/png")
    assert tensor.shape == (1, 3, 224, 224)
    assert torch.isfinite(tensor).all()
    x, y, width, height = bounds
    assert 0 < x < 60 and 0 < y < 30
    assert width < 180 and height < 120
    features = torch.ones(1, 1, 7, 7)
    encoded = make_overlay(features, features, original, bounds)
    overlay = np.array(Image.open(BytesIO(base64.b64decode(encoded))).convert("RGB"))
    assert overlay.shape == pixels.shape
    assert np.array_equal(overlay[:y], pixels[:y])
    assert not np.array_equal(overlay, pixels)
