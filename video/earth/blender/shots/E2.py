"""E2 — orbit diagram (31–37 s): Earth keeps orbiting the Sun but no longer rotates (fixed orientation),
so the marked spot (India) slides from day into night over half an orbit = ~6 months.
Illustrative, not to scale, axial tilt ignored."""
import math
import bpy
from mathutils import Vector
from common import reset, camera, key_cam_path, ease_in_out, lerp, emission_mat, uv_sphere, set_mat, new_mat, link_obj
from planet import Planet, space_world, spin_facing, INDIA, marker, ring

FRAMES = 184
R = 4.0
TH0 = math.radians(0)  # start position (top of frame after the 90 deg camera roll)


def theta(f):
    t = min(1.0, max(0.0, (f - 10) / 165))
    return TH0 + math.pi * ease_in_out(t)


def sun_glow(radius):
    m, n, l, out = new_mat("SunGlow")
    lw = n.new("ShaderNodeLayerWeight"); lw.inputs[0].default_value = 0.5
    pw = n.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 3.0
    inv = n.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0
    l.new(lw.outputs["Facing"], inv.inputs[1]); l.new(inv.outputs[0], pw.inputs[0])
    mul = n.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = 3.0
    l.new(pw.outputs[0], mul.inputs[0])
    e = n.new("ShaderNodeEmission"); e.inputs[0].default_value = (1.0, 0.62, 0.22, 1); l.new(mul.outputs[0], e.inputs[1])
    tr = n.new("ShaderNodeBsdfTransparent"); add = n.new("ShaderNodeAddShader")
    l.new(tr.outputs[0], add.inputs[0]); l.new(e.outputs[0], add.inputs[1]); l.new(add.outputs[0], out.inputs[0])
    s = uv_sphere("SunGlow", radius, 64, 32)
    set_mat(s, m); s.visible_shadow = False
    return s


def build():
    reset(res=(720, 1280), samples=8, motion_blur=False)
    space_world(0.5)
    sun = uv_sphere("Sun", 0.7, 64, 32)
    set_mat(sun, emission_mat("SunSurface", (1.0, 0.72, 0.32), 14))
    sun.visible_shadow = False
    sun_glow(1.5)
    ld = bpy.data.lights.new("SunPoint", "POINT"); ld.energy = 9000; ld.shadow_soft_size = 0.9; ld.color = (1, 0.95, 0.88)
    lo = bpy.data.objects.new("SunPoint", ld); link_obj(lo)
    ring("Orbit", R, 0.012, (0.75, 0.85, 1.0), 2.2)
    p = Planet(tilt=False, radius=0.8, atmo=1.2)
    # fixed orientation: India faces the Sun at the start (sun lies toward azimuth TH0+180 deg from Earth)
    spin0 = spin_facing(INDIA[1]) + (TH0 + math.pi) - math.radians(-90)
    for f in range(0, FRAMES + 1):
        th = theta(f)
        pos = Vector((R * math.cos(th), R * math.sin(th), 0))
        p.tilt.location = pos
        p.tilt.keyframe_insert("location", frame=f)
        p.key(f, spin0)
        p.set_sun(-pos, frame=f)
    marker(p, *INDIA, size=0.045, strength=18)
    cam = camera(lens=32)
    # high camera, rolled 90 deg so the half orbit runs top -> bottom in the vertical frame
    key_cam_path(cam, range(0, FRAMES + 1),
                 lambda f: (lerp(-0.6, 0.6, f / FRAMES), lerp(-4.2, -3.6, f / FRAMES), lerp(15.0, 14.4, ease_in_out(f / FRAMES))),
                 lambda f: (0.0, 0.6, 0.0),
                 roll_fn=lambda f: math.radians(90))
