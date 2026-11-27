"""Shared Blender (bpy 5.x) helpers for the 'Earth stopped rotating' shots.

Everything is procedural except the NASA Blue Marble / Black Marble / cloud
textures in public/earth/textures (public domain, via the three-globe npm pkg).
"""
import math, os, random
import bpy
from mathutils import Vector, Euler, Matrix

VIDEO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TEX = os.path.join(VIDEO, "public", "earth", "textures")
RENDERS = os.path.join(VIDEO, "public", "earth", "renders")
FPS = 30


# ----------------------------------------------------------------- scene setup
def reset(res=(576, 1024), samples=16, motion_blur=True, film_transparent=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.05
    sc.cycles.use_denoising = True
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.max_bounces = 3
    sc.cycles.diffuse_bounces = 1
    sc.cycles.glossy_bounces = 1
    sc.cycles.transmission_bounces = 2
    sc.cycles.volume_bounces = 0
    sc.cycles.transparent_max_bounces = 4
    sc.cycles.use_light_tree = True
    sc.render.use_persistent_data = True
    sc.cycles.texture_limit_render = "1024"
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.blur_glossy = 1.0
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.fps = FPS
    sc.render.use_motion_blur = motion_blur
    sc.render.motion_blur_shutter = 0.5
    sc.render.film_transparent = film_transparent
    sc.render.image_settings.file_format = "JPEG"
    sc.render.image_settings.quality = 93
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.render.threads_mode = "AUTO"
    world = bpy.data.worlds.new("World")
    sc.world = world
    return sc


def nodes_of(mat_or_world):
    mat_or_world.use_nodes = True
    nt = mat_or_world.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    return nt.nodes, nt.links


def new_mat(name):
    m = bpy.data.materials.new(name)
    n, l = nodes_of(m)
    out = n.new("ShaderNodeOutputMaterial")
    return m, n, l, out


def principled(name, color=(0.8, 0.8, 0.8), rough=0.5, metal=0.0, emission=None, estr=0.0, spec=0.5):
    m, n, l, out = new_mat(name)
    b = n.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Specular IOR Level"].default_value = spec
    if emission:
        b.inputs["Emission Color"].default_value = (*emission, 1)
        b.inputs["Emission Strength"].default_value = estr
    l.new(b.outputs[0], out.inputs[0])
    return m


def emission_mat(name, color, strength):
    m, n, l, out = new_mat(name)
    e = n.new("ShaderNodeEmission")
    e.inputs[0].default_value = (*color, 1)
    e.inputs[1].default_value = strength
    l.new(e.outputs[0], out.inputs[0])
    return m


def img(path, colorspace="sRGB"):
    im = bpy.data.images.load(path, check_existing=True)
    im.colorspace_settings.name = colorspace
    return im


def link_obj(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def set_mat(ob, m):
    ob.data.materials.clear()
    ob.data.materials.append(m)


def smooth(ob):
    for p in ob.data.polygons:
        p.use_smooth = True


def uv_sphere(name, r, seg=128, rings=64, loc=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=r, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    smooth(ob)
    return ob


def cube(name, size, loc, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    if bevel > 0:
        md = ob.modifiers.new("bev", "BEVEL")
        md.width = bevel
        md.segments = 2
        md.limit_method = "NONE"
        md.affect = "EDGES"
        md.use_clamp_overlap = True
        md.harden_normals = False
    return ob


def camera(name="Cam", lens=35, loc=(0, 0, 0), sensor=36, dof_obj=None, fstop=2.8, clip=(0.05, 5000)):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cd.sensor_fit = "VERTICAL"
    cd.sensor_height = sensor
    cd.clip_start, cd.clip_end = clip
    cam = bpy.data.objects.new(name, cd)
    link_obj(cam)
    cam.location = loc
    if dof_obj is not None:
        cd.dof.use_dof = True
        cd.dof.aperture_fstop = fstop
        if isinstance(dof_obj, (int, float)):
            cd.dof.focus_distance = dof_obj
        else:
            cd.dof.focus_object = dof_obj
    bpy.context.scene.camera = cam
    return cam


def look_at(ob, target, roll=0.0):
    d = Vector(target) - ob.location
    q = d.to_track_quat("-Z", "Y")
    ob.rotation_mode = "XYZ"
    e = q.to_euler()
    if roll:
        e = (q @ Euler((0, 0, roll)).to_quaternion()).to_euler()
    ob.rotation_euler = e


def key_cam_path(cam, frames, pos_fn, target_fn, roll_fn=None, lens_fn=None, focus_fn=None):
    """Bake an animated camera from python functions of the frame number."""
    prev = None
    for f in frames:
        cam.location = Vector(pos_fn(f))
        look_at(cam, target_fn(f), roll_fn(f) if roll_fn else 0.0)
        if prev is not None:  # keep euler continuity (avoid flips)
            e = cam.rotation_euler.copy()
            e.make_compatible(prev)
            cam.rotation_euler = e
        prev = cam.rotation_euler.copy()
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_euler", frame=f)
        if lens_fn:
            cam.data.lens = lens_fn(f)
            cam.data.keyframe_insert("lens", frame=f)
        if focus_fn:
            cam.data.dof.focus_distance = focus_fn(f)
            cam.data.dof.keyframe_insert("focus_distance", frame=f)
    linear_keys(cam)
    linear_keys(cam.data)


def linear_keys(idblock):
    ad = idblock.animation_data
    if not ad or not ad.action:
        return
    # Blender 5 layered actions: walk all fcurves of all slots/channelbags
    for fc in iter_fcurves(ad.action):
        for k in fc.keyframe_points:
            k.interpolation = "LINEAR"


def iter_fcurves(action):
    if hasattr(action, "fcurves") and len(getattr(action, "fcurves", [])):
        yield from action.fcurves
        return
    for layer in getattr(action, "layers", []):
        for strip in layer.strips:
            for cb in strip.channelbags:
                yield from cb.fcurves


def sun_light(name, direction, strength=4.0, color=(1, 0.97, 0.92), angle_deg=0.53):
    ld = bpy.data.lights.new(name, "SUN")
    ld.energy = strength
    ld.color = color
    ld.angle = math.radians(angle_deg)
    ob = bpy.data.objects.new(name, ld)
    link_obj(ob)
    d = Vector(direction).normalized()  # direction the light TRAVELS
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return ob


def area_light(name, loc, target, size=5, power=500, color=(1, 1, 1)):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = power
    ld.size = size
    ld.color = color
    ob = bpy.data.objects.new(name, ld)
    link_obj(ob)
    ob.location = loc
    look_at(ob, target)
    return ob


# ------------------------------------------------------------------ easing
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def smoothstep(e0, e1, x):
    t = clamp((x - e0) / (e1 - e0))
    return t * t * (3 - 2 * t)


def ease_in_out(t):
    t = clamp(t)
    return t * t * (3 - 2 * t)


def ease_out(t, p=3):
    t = clamp(t)
    return 1 - (1 - t) ** p


def ease_in(t, p=3):
    t = clamp(t)
    return t ** p


def lerp(a, b, t):
    return a + (b - a) * t


def vlerp(a, b, t):
    return Vector(a).lerp(Vector(b), t)


# ------------------------------------------------------------------ worlds
def space_world(strength=0.35, stars=True):
    w = bpy.context.scene.world
    n, l = nodes_of(w)
    out = n.new("ShaderNodeOutputWorld")
    bg = n.new("ShaderNodeBackground")
    if stars:
        tc = n.new("ShaderNodeTexCoord")
        et = n.new("ShaderNodeTexEnvironment")
        et.image = img(os.path.join(TEX, "night-sky.png"))
        l.new(tc.outputs["Generated"], et.inputs[0])
        gam = n.new("ShaderNodeGamma")
        gam.inputs[1].default_value = 1.6
        l.new(et.outputs[0], gam.inputs[0])
        l.new(gam.outputs[0], bg.inputs[0])
    else:
        bg.inputs[0].default_value = (0, 0, 0, 1)
    bg.inputs[1].default_value = strength
    # camera sees stars, but they don't light the scene
    lp = n.new("ShaderNodeLightPath")
    mix = n.new("ShaderNodeMixShader")
    dark = n.new("ShaderNodeBackground")
    dark.inputs[0].default_value = (0.0, 0.0, 0.0, 1)
    l.new(lp.outputs["Is Camera Ray"], mix.inputs[0])
    l.new(dark.outputs[0], mix.inputs[1])
    l.new(bg.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], out.inputs[0])
    return w


def sky_world(sun_elev_deg=20, sun_rot_deg=0, strength=1.0, air=1.0, dust=1.0, ozone=1.0, tint=None):
    w = bpy.context.scene.world
    n, l = nodes_of(w)
    out = n.new("ShaderNodeOutputWorld")
    bg = n.new("ShaderNodeBackground")
    sky = n.new("ShaderNodeTexSky")
    for st in ("MULTIPLE_SCATTERING", "NISHITA", "SINGLE_SCATTERING"):
        try:
            sky.sky_type = st
            break
        except TypeError:
            continue
    sky.sun_elevation = math.radians(sun_elev_deg)
    sky.sun_rotation = math.radians(sun_rot_deg)
    for attr, v in (("air_density", air), ("dust_density", dust), ("aerosol_density", dust), ("ozone_density", ozone)):
        if hasattr(sky, attr):
            setattr(sky, attr, v)
    if hasattr(sky, "sun_disc"):
        sky.sun_disc = False
    src = sky.outputs[0]
    if tint:
        mixc = n.new("ShaderNodeMix")
        mixc.data_type = "RGBA"
        mixc.blend_type = "MULTIPLY"
        mixc.inputs["Factor"].default_value = 1.0
        l.new(src, mixc.inputs[6])
        mixc.inputs[7].default_value = (*tint, 1)
        src = mixc.outputs[2]
    l.new(src, bg.inputs[0])
    bg.inputs[1].default_value = strength
    l.new(bg.outputs[0], out.inputs[0])
    return w


def flat_world(color, strength=1.0):
    w = bpy.context.scene.world
    n, l = nodes_of(w)
    out = n.new("ShaderNodeOutputWorld")
    bg = n.new("ShaderNodeBackground")
    bg.inputs[0].default_value = (*color, 1)
    bg.inputs[1].default_value = strength
    l.new(bg.outputs[0], out.inputs[0])
    return w


def gradient_world(top, horizon, strength=1.0):
    """Overcast / stormy sky: vertical gradient by view direction z."""
    w = bpy.context.scene.world
    n, l = nodes_of(w)
    out = n.new("ShaderNodeOutputWorld")
    bg = n.new("ShaderNodeBackground")
    tc = n.new("ShaderNodeTexCoord")
    sep = n.new("ShaderNodeSeparateXYZ")
    l.new(tc.outputs["Generated"], sep.inputs[0])
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (*horizon, 1)
    ramp.color_ramp.elements[1].position = 0.6
    ramp.color_ramp.elements[1].color = (*top, 1)
    mr = n.new("ShaderNodeMapRange")
    mr.inputs[1].default_value = 0.0
    mr.inputs[2].default_value = 1.0
    l.new(sep.outputs[2], mr.inputs[0])
    l.new(mr.outputs[0], ramp.inputs[0])
    l.new(ramp.outputs[0], bg.inputs[0])
    bg.inputs[1].default_value = strength
    l.new(bg.outputs[0], out.inputs[0])
    return w


def mist(start, depth, falloff="QUADRATIC"):
    sc = bpy.context.scene
    sc.world.mist_settings.start = start
    sc.world.mist_settings.depth = depth
    sc.world.mist_settings.falloff = falloff


# ------------------------------------------------------------------ rendering
def render_frames(shot, f0, f1, step=1, only=None):
    sc = bpy.context.scene
    outdir = os.path.join(RENDERS, shot)
    os.makedirs(outdir, exist_ok=True)
    frames = only if only else range(f0, f1 + 1, step)
    for f in frames:
        path = os.path.join(outdir, f"{f - f0:04d}.jpg")
        if os.path.exists(path) and os.environ.get("SKIP_EXISTING"):
            continue
        sc.frame_set(f)
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print(f"[{shot}] frame {f} -> {path}", flush=True)
