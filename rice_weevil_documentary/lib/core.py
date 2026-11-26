"""Core helpers: scene setup, procedural mesh builders, keyframing utilities.

Units: 1 Blender unit = 1 millimetre (scene.unit_settings.scale_length = 0.001),
so camera depth of field behaves like a real macro lens.
"""
import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector, noise

FPS = 30
TARGET = None  # collection new objects are linked into (set per scene)


def target():
    return TARGET if TARGET is not None else bpy.context.scene.collection
RES_X, RES_Y = 1080, 1920


# --------------------------------------------------------------------------- scene
def new_scene(name, frame_start, frame_end, samples=32):
    scn = bpy.data.scenes.new(name)
    scn.frame_start, scn.frame_end = frame_start, frame_end
    scn.render.fps = FPS
    scn.render.resolution_x, scn.render.resolution_y = RES_X, RES_Y
    scn.render.resolution_percentage = 100
    scn.unit_settings.system = 'METRIC'
    scn.unit_settings.scale_length = 0.001
    scn.unit_settings.length_unit = 'MILLIMETERS'
    scn.render.engine = 'CYCLES'
    cy = scn.cycles
    cy.device = 'CPU'
    cy.samples = samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.04
    cy.use_denoising = True
    cy.denoiser = 'OPENIMAGEDENOISE'
    cy.max_bounces = 4
    cy.diffuse_bounces = 1
    cy.glossy_bounces = 2
    cy.transmission_bounces = 4
    cy.transparent_max_bounces = 8
    cy.volume_bounces = 0
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.blur_glossy = 1.0
    scn.render.use_persistent_data = True
    scn.view_settings.view_transform = 'AgX'
    scn.view_settings.look = 'AgX - Medium High Contrast'
    scn.render.image_settings.file_format = 'PNG'
    scn.render.image_settings.color_mode = 'RGB'
    scn.render.image_settings.compression = 15
    scn.render.film_transparent = False
    # motion blur adds realism to fast camera moves
    scn.render.use_motion_blur = False
    scn.render.motion_blur_shutter = 0.35
    w = bpy.data.worlds.new(name + "_world")
    scn.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.004, 0.006, 0.009, 1)
    bg.inputs[1].default_value = 1.0
    return scn


def link(obj, coll):
    for c in obj.users_collection:
        c.objects.unlink(obj)
    coll.objects.link(obj)
    return obj


def new_collection(scn, name):
    c = bpy.data.collections.new(name)
    scn.collection.children.link(c)
    return c


# --------------------------------------------------------------------------- meshes
def _finish_mesh(bm, name, smooth=True, subsurf=1):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        me.shade_smooth()
    obj = bpy.data.objects.new(name, me)
    target().objects.link(obj)
    if subsurf:
        m = obj.modifiers.new("Subsurf", 'SUBSURF')
        m.levels = subsurf
        m.render_levels = subsurf
    return obj


def ellipsoid(name, size, loc=(0, 0, 0), segs=(32, 16), subsurf=1, deform=None):
    """size = full lengths (x, y, z). deform(v: Vector)->Vector optional."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs[0], v_segments=segs[1], radius=1.0)
    for v in bm.verts:
        co = Vector((v.co.x * size[0] / 2, v.co.y * size[1] / 2, v.co.z * size[2] / 2))
        if deform:
            co = deform(co)
        v.co = co
    obj = _finish_mesh(bm, name, subsurf=subsurf)
    obj.location = loc
    return obj


def tube(name, points, radii, ring=12, cap=True, subsurf=1, squash=1.0, radius_fn=None):
    """Sweep a circular (optionally squashed) ring along a polyline.

    points: list of Vector; radii: list of float (same length) or single float.
    radius_fn(i, t, angle) -> multiplier, optional (for segment bulges, etc.).
    """
    pts = [Vector(p) for p in points]
    n = len(pts)
    if not isinstance(radii, (list, tuple)):
        radii = [radii] * n
    # parallel-transport frames
    tangents = []
    for i in range(n):
        if i == 0:
            t = pts[1] - pts[0]
        elif i == n - 1:
            t = pts[-1] - pts[-2]
        else:
            t = pts[i + 1] - pts[i - 1]
        tangents.append(t.normalized())
    ref = Vector((0, 0, 1)) if abs(tangents[0].z) < 0.9 else Vector((0, 1, 0))
    normal = tangents[0].cross(ref).normalized()
    frames = []
    for i in range(n):
        if i > 0:
            axis = tangents[i - 1].cross(tangents[i])
            if axis.length > 1e-6:
                ang = tangents[i - 1].angle(tangents[i])
                normal = (Matrix.Rotation(ang, 3, axis.normalized()) @ normal).normalized()
        binormal = tangents[i].cross(normal).normalized()
        frames.append((normal.copy(), binormal))
    bm = bmesh.new()
    rings = []
    for i, p in enumerate(pts):
        nrm, bn = frames[i]
        ring_verts = []
        for k in range(ring):
            a = 2 * math.pi * k / ring
            mult = radius_fn(i, i / (n - 1), a) if radius_fn else 1.0
            r = radii[i] * mult
            off = nrm * math.cos(a) * r + bn * math.sin(a) * r * squash
            ring_verts.append(bm.verts.new(p + off))
        rings.append(ring_verts)
    for i in range(n - 1):
        for k in range(ring):
            a, b = rings[i][k], rings[i][(k + 1) % ring]
            c, d = rings[i + 1][(k + 1) % ring], rings[i + 1][k]
            bm.faces.new((a, b, c, d))
    if cap:
        for idx, end in ((0, pts[0]), (n - 1, pts[-1])):
            tip_dir = (pts[0] - pts[1]) if idx == 0 else (pts[-1] - pts[-2])
            tip = bm.verts.new(end + tip_dir.normalized() * radii[idx] * 0.6)
            r = rings[idx]
            for k in range(ring):
                if idx == 0:
                    bm.faces.new((r[(k + 1) % ring], r[k], tip))
                else:
                    bm.faces.new((r[k], r[(k + 1) % ring], tip))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _finish_mesh(bm, name, subsurf=subsurf)


def empty(name, loc=(0, 0, 0), parent=None, size=0.2):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = size
    target().objects.link(e)
    if parent:
        e.parent = parent
    e.location = loc
    return e


def parent_keep(child, parent):
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()


def collect_tree(root):
    out = [root]
    for c in root.children:
        out.extend(collect_tree(c))
    return out


def move_tree_to(root, coll):
    for o in collect_tree(root):
        link(o, coll)


# --------------------------------------------------------------------------- animation
def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def ease(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def ease_io(t):
    t = max(0.0, min(1.0, t))
    return 0.5 - 0.5 * math.cos(math.pi * t)


def lerp(a, b, t):
    return a + (b - a) * t


def vlerp(a, b, t):
    return Vector(a).lerp(Vector(b), t)


def nz(seed, t, freq=1.0):
    """Smooth 1D noise in [-1, 1]."""
    return noise.noise(Vector((t * freq, seed * 13.37, seed * 7.1)))


def key(obj, path, frame, value=None, index=-1):
    if value is not None:
        setattr(obj, path, value)
    obj.keyframe_insert(data_path=path, frame=frame, index=index)


def set_linear(obj):
    ad = obj.animation_data
    if ad and ad.action:
        fcs = getattr(ad.action, "fcurves", None)
        if fcs is None:  # Blender 4.4+ layered actions
            fcs = [fc for layer in ad.action.layers for strip in layer.strips
                   for bag in strip.channelbags for fc in bag.fcurves]
        for fc in fcs:
            for kp in fc.keyframe_points:
                kp.interpolation = 'LINEAR'


def bake_fn(obj, path, f0, f1, fn, step=1):
    """Keyframe obj.path for each frame using fn(frame) -> value."""
    for f in range(f0, f1 + 1, step):
        setattr(obj, path, fn(f))
        obj.keyframe_insert(data_path=path, frame=f)


def rng(seed):
    return random.Random(seed)
