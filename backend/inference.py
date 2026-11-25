import os
from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image, UnidentifiedImageError
from torch import nn

from gradcam import make_overlay

CLASS_NAMES = ["Mild", "Moderate", "No_DR", "Proliferative_DR", "Severe"]


def load_model():
    from torchvision.models import resnet50

    model = resnet50(weights=None)
    model.fc = nn.Sequential(nn.Linear(2048, 512), nn.ReLU(), nn.Dropout(.5), nn.Linear(512, 5))
    path = os.getenv("MODEL_PATH", Path(__file__).parent / "models/best_model.pt")
    model.load_state_dict(torch.load(path, map_location="cpu", weights_only=True))
    return model.eval()


class InvalidImage(ValueError):
    pass


def preprocess_image(data, mime):
    try:
        with Image.open(BytesIO(data)) as header:
            if header.format != {"image/jpeg": "JPEG", "image/png": "PNG"}[mime]:
                raise InvalidImage("Image contents do not match the file type.")
        image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR | cv2.IMREAD_IGNORE_ORIENTATION)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, cv2.error) as exc:
        raise InvalidImage("Unreadable image.") from exc
    if image is None:
        raise InvalidImage("Unreadable image.")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    _, threshold = cv2.threshold(blur, 10, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(threshold, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    height, width = image.shape[:2]
    bounds = (0, 0, width, height)
    cropped = image
    if contours:
        contour = max(contours, key=cv2.contourArea)
        (cx, cy), radius = cv2.minEnclosingCircle(contour)
        mask = np.zeros(image.shape[:2], np.uint8)
        cv2.circle(mask, (int(cx), int(cy)), int(radius), 255, -1)
        x, y, w, h = bounds = cv2.boundingRect(contour)
        cropped = cv2.bitwise_and(image, image, mask=mask)[y:y+h, x:x+w]
    resized = cv2.resize(cropped, (224, 224), interpolation=cv2.INTER_AREA)
    lab = cv2.cvtColor(resized, cv2.COLOR_BGR2LAB)
    lab[:, :, 0] = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(lab[:, :, 0])
    rgb = cv2.cvtColor(cv2.cvtColor(lab, cv2.COLOR_LAB2BGR), cv2.COLOR_BGR2RGB)
    tensor = torch.from_numpy(rgb).permute(2, 0, 1).float() / 255
    tensor = (tensor - torch.tensor([.485, .456, .406])[:, None, None]) / torch.tensor([.229, .224, .225])[:, None, None]
    return tensor.unsqueeze(0), image, bounds


def predict(model, data, mime):
    tensor, image, bounds = preprocess_image(data, mime)
    # ResNet's layer4 output is the activation of its final residual block.
    with torch.no_grad():
        features = model.maxpool(model.relu(model.bn1(model.conv1(tensor))))
        features = model.layer4(model.layer3(model.layer2(model.layer1(features))))
    features.requires_grad_()
    logits = model.fc(model.avgpool(features).flatten(1))
    probabilities = logits.detach().softmax(1)[0]
    index = int(probabilities.argmax())
    gradient, = torch.autograd.grad(logits[0, index], features)
    return dict(grade=CLASS_NAMES[index], confidence=float(probabilities[index]),
                probabilities=dict(zip(CLASS_NAMES, probabilities.tolist())),
                gradcam_overlay=make_overlay(features.detach(), gradient, image, bounds))
