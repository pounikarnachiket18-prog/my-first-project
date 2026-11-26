"""Camera + lighting rigs."""
import math

import bpy
from mathutils import Vector

from . import core


def camera(name, coll, lens=100.0, fstop=4.0, sensor=36.0):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cd.sensor_width = sensor
    cd.clip_start = 0.05
    cd.clip_end = 2000
    cd.dof.use_dof = True
    cd.dof.aperture_fstop = fstop
    cd.dof.aperture_blades = 7
    cd.dof.aperture_ratio = 1.0
    cam = bpy.data.objects.new(name, cd)
    coll.objects.link(cam)
    target = bpy.data.objects.new(name + "_target", None)
    coll.objects.link(target)
    c = cam.constraints.new('TRACK_TO')
    c.target = target
    c.track_axis = 'TRACK_NEGATIVE_Z'
    c.up_axis = 'UP_Y'
    focus = bpy.data.objects.new(name + "_focus", None)
    coll.objects.link(focus)
    cd.dof.focus_object = focus
    return cam, target, focus


def animate_camera(cam, target, focus, f0, f1, pos_fn, tgt_fn, focus_fn=None, fstop_fn=None,
                   lens_fn=None, roll_fn=None):
    """Per-frame keys from smooth functions of normalised time t in [0,1]."""
    for f in range(f0, f1 + 1):
        t = (f - f0) / max(1, (f1 - f0))
        cam.location = pos_fn(t)
        target.location = tgt_fn(t)
        focus.location = focus_fn(t) if focus_fn else tgt_fn(t)
        cam.keyframe_insert("location", frame=f)
        target.keyframe_insert("location", frame=f)
        focus.keyframe_insert("location", frame=f)
        if fstop_fn:
            cam.data.dof.aperture_fstop = fstop_fn(t)
            cam.data.dof.keyframe_insert("aperture_fstop", frame=f)
        if lens_fn:
            cam.data.lens = lens_fn(t)
            cam.data.keyframe_insert("lens", frame=f)
        if roll_fn:
            cam.constraints[0].up_axis = 'UP_Y'
            cam.rotation_euler = (0, 0, roll_fn(t))


def area_light(name, coll, loc, target, power, size=4.0, color=(1, 1, 1), spread=180.0):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.energy = power
    ld.size = size
    ld.color = color
    ld.spread = math.radians(spread)
    lo = bpy.data.objects.new(name, ld)
    coll.objects.link(lo)
    lo.location = loc
    direction = Vector(target) - Vector(loc)
    lo.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    return lo


def spot(name, coll, loc, target, power, angle=30.0, blend=0.6, color=(1, 1, 1), radius=0.5):
    ld = bpy.data.lights.new(name, 'SPOT')
    ld.energy = power
    ld.spot_size = math.radians(angle)
    ld.spot_blend = blend
    ld.color = color
    ld.shadow_soft_size = radius
    lo = bpy.data.objects.new(name, ld)
    coll.objects.link(lo)
    lo.location = loc
    direction = Vector(target) - Vector(loc)
    lo.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    return lo


WARM = (1.0, 0.82, 0.62)
COOL = (0.62, 0.8, 1.0)
NEUTRAL = (1.0, 0.96, 0.9)


def three_point(coll, center, dist=14.0, key=60.0, fill=12.0, rim=140.0, key_col=WARM,
                rim_col=COOL, height=1.0):
    """Cinematic key / fill / rim. Powers are in Watts at millimetre scale."""
    c = Vector(center)
    k = area_light("Key", coll, c + Vector((dist * 0.7, -dist * 0.8, dist * 0.6 * height)), c,
                   key, size=dist * 0.5, color=key_col)
    f = area_light("Fill", coll, c + Vector((-dist, -dist * 0.4, dist * 0.2)), c, fill,
                   size=dist * 0.8, color=(0.85, 0.9, 1.0))
    r = area_light("Rim", coll, c + Vector((-dist * 0.3, dist * 1.1, dist * 0.5 * height)), c,
                   rim, size=dist * 0.25, color=rim_col)
    return k, f, r


def world_gradient(scn, top=(0.012, 0.018, 0.028), bottom=(0.002, 0.002, 0.003), strength=1.0):
    nt = scn.world.node_tree
    nt.nodes.clear()
    co = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(co.outputs["Generated"], sep.inputs[0])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*bottom, 1)
    ramp.color_ramp.elements[1].color = (*top, 1)
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[1].position = 0.75
    nt.links.new(sep.outputs[2], ramp.inputs[0])
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs[1].default_value = strength
    nt.links.new(ramp.outputs[0], bg.inputs[0])
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(bg.outputs[0], out.inputs[0])


def ground(coll, z=0.0, size=400, color=(0.02, 0.018, 0.016), rough=0.7, name="Ground"):
    me = bpy.data.meshes.new(name)
    s = size / 2
    me.from_pydata([(-s, -s, z), (s, -s, z), (s, s, z), (-s, s, z)], [], [(0, 1, 2, 3)])
    obj = bpy.data.objects.new(name, me)
    coll.objects.link(obj)
    mat = bpy.data.materials.new(name + "_mat")
    mat.use_nodes = True
    p = mat.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Roughness"].default_value = rough
    me.materials.append(mat)
    return obj
