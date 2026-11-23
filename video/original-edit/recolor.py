"""Selective recolor: move blue hues (berth, labels, corridor, cover) to a new
hue, keep skin/hair/greys/whites. Works on RGB uint8 arrays."""
import numpy as np, cv2

def recolor(rgb, target_hue_deg, sat_boost=1.0, val_scale=1.0):
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV_FULL).astype(np.float32)  # H 0..255
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    hdeg = h * 360 / 256
    # blue band ~ 195..260 deg, soft edges; ignore near-grey pixels
    w_h = np.clip(1 - np.abs(hdeg - 228) / 42, 0, 1)
    w_h = np.clip(w_h * 1.6, 0, 1)
    w_s = np.clip((s - 28) / 40, 0, 1)
    w = w_h * w_s
    new_h = (target_hue_deg + (hdeg - 228) * 0.6) % 360
    hsv[..., 0] = np.where(w > 0, (h * (1 - w) + (new_h * 256 / 360) * w), h)
    hsv[..., 1] = np.clip(s * (1 + (sat_boost - 1) * w), 0, 255)
    hsv[..., 2] = np.clip(v * (1 + (val_scale - 1) * w), 0, 255)
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB_FULL)
