"""F2 — "Ek taraf extreme heat" (40.5–42.5 s): Thar desert under a sun that never sets; the hero shields his eyes."""
import math, random
import bpy
from mathutils import Vector
from common import reset, sky_world, sun_light, camera, key_cam_path, lerp, ease_in_out, uv_sphere, emission_mat, set_mat, new_mat
from landscape import terrain
from city import fog_all
import character as C

FRAMES = 64


def sand():
    m, n, l, out = new_mat("Sand")
    tc = n.new("ShaderNodeTexCoord")
    w = n.new("ShaderNodeTexWave"); w.inputs["Scale"].default_value = 0.9; w.inputs["Distortion"].default_value = 3; w.inputs["Detail"].default_value = 4
    l.new(tc.outputs["Object"], w.inputs[0])
    nz = n.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.05; l.new(tc.outputs["Object"], nz.inputs[0])
    col = n.new("ShaderNodeMix"); col.data_type = "RGBA"; l.new(nz.outputs["Fac"], col.inputs[0])
    col.inputs[6].default_value = (0.78, 0.5, 0.24, 1); col.inputs[7].default_value = (0.9, 0.66, 0.38, 1)
    b = n.new("ShaderNodeBsdfPrincipled"); l.new(col.outputs[2], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.95
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35
    l.new(w.outputs["Fac"], bump.inputs["Height"]); l.new(bump.outputs[0], b.inputs["Normal"])
    l.new(b.outputs[0], out.inputs[0])
    return m


def build():
    reset(res=(648, 1152), samples=4, motion_blur=False)
    el = math.radians(38)
    sky_world(sun_elev_deg=38, sun_rot_deg=0, strength=0.35, dust=5.0, tint=(1.0, 0.82, 0.62))
    sun_light("Sun", (-math.cos(el), 0.1, -math.sin(el)), strength=6.0, color=(1.0, 0.9, 0.75), angle_deg=1.2)
    t = terrain("Dunes", size=900, subdiv=240, scale=0.6, strength=18, seed_offset=(5.5, 1.3, 0.0), flat_radius=25)
    set_mat(t, sand())
    d = Vector((math.cos(el), -0.1, math.sin(el))).normalized() * 2200
    s = uv_sphere("SunDisc", 34, 32, 16, loc=tuple(d))
    set_mat(s, emission_mat("_nofog", (1.0, 0.95, 0.85), 160)); s.visible_shadow = False
    fog_all((0.98, 0.72, 0.45), 0.0022, 0.9)
    hero = C.Person("hero", "brown", True, loc=(0, 0, 0.0), heading=math.radians(70))  # faces the sun side (+X-ish)
    for f in range(0, FRAMES + 1, 4):
        hero.key(f, C.shield_eyes(f / 30))
    cam = camera(lens=26, fstop=2.8, dof_obj=2.6)
    key_cam_path(cam, range(0, FRAMES + 1),
                 lambda f: (lerp(1.2, 1.6, f / FRAMES), lerp(-2.6, -2.2, ease_in_out(f / FRAMES)), lerp(0.7, 0.85, f / FRAMES)),
                 lambda f: (lerp(-0.2, 0.0, f / FRAMES), 0.2, lerp(1.7, 1.75, f / FRAMES)))
