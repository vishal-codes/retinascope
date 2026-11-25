import base64

import cv2
import numpy as np


def make_overlay(features, gradient, image, bounds):
    weights = gradient.mean(dim=(2, 3), keepdim=True)
    heat = (features * weights).sum(dim=1)[0].relu().numpy()
    heat = cv2.normalize(heat, None, 0, 1, cv2.NORM_MINMAX)
    x, y, width, height = bounds
    heat = cv2.resize(heat, (width, height))
    colors = cv2.applyColorMap(np.uint8(255 * heat), cv2.COLORMAP_JET)
    roi = image[y:y+height, x:x+width]
    roi[:] = cv2.addWeighted(roi, .65, colors, .35, 0)
    success, encoded = cv2.imencode(".png", image)
    if not success:
        raise RuntimeError("Overlay encoding failed.")
    return base64.b64encode(encoded).decode("ascii")
