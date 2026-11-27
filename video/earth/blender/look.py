"""Reference look: bright overcast monsoon daylight, soft shadows, light haze."""
import math
from common import gradient_world, sun_light
from city import fog_all


def overcast(sun_dir=(0.35, 0.55, -0.75), sun=1.6, sky=1.25, haze=0.0016, haze_col=(0.78, 0.8, 0.82)):
    gradient_world(top=(0.62, 0.66, 0.72), horizon=(0.9, 0.9, 0.9), strength=sky)
    sun_light("Sun", sun_dir, strength=sun, color=(1.0, 0.98, 0.95), angle_deg=12)
    if haze > 0:
        fog_all(haze_col, haze, 1.25)
