import subprocess, sys
import numpy as np
sys.path.insert(0, sys.argv[3])
from recolor import recolor
W, H = 720, 1280
src, hue, sb, vs = sys.argv[1], float(sys.argv[2]), float(sys.argv[4]), float(sys.argv[5])
dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
out = sys.stdout.buffer
while True:
    b = dec.stdout.read(W * H * 3)
    if len(b) < W * H * 3:
        break
    out.write(recolor(np.frombuffer(b, np.uint8).reshape(H, W, 3), hue, sb, vs).tobytes())
