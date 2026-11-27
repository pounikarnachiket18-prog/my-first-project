"""Rigged human characters for the reel (Ready Player Me avatar, restyled for an Indian setting).

The glTF is downloaded by earth/tools/fetch_assets.sh (not committed). Each `Person` is an imported
copy with its own tinted materials, so crowds can vary clothing and skin tone.

Posing: limbs are aimed at world-space directions (armature space, character faces -Y,
his left = +X, up = +Z), which keeps pose definitions readable:  pose = {bone: (x, y, z)}.
"""
import math, os, random
import bpy
from mathutils import Vector, Quaternion, Matrix

VIDEO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RPM = os.path.join(VIDEO, "earth", "assets", "readyplayer.me.glb")

SKIN = {"wheat": (0.86, 0.68, 0.56), "brown": (0.66, 0.48, 0.38), "dusky": (0.52, 0.37, 0.29)}
OUTFITS = {
    # top tint, bottom tint, shoe tint
    "hero": ((0.035, 0.06, 0.14), (0.62, 0.58, 0.5), (0.25, 0.14, 0.08)),  # navy kurta-jacket, beige trousers
    "white_kurta": ((0.85, 0.84, 0.8), (0.8, 0.78, 0.74), (0.3, 0.2, 0.12)),
    "saffron": ((0.85, 0.36, 0.06), (0.15, 0.15, 0.17), (0.2, 0.15, 0.1)),
    "maroon": ((0.4, 0.05, 0.07), (0.7, 0.66, 0.58), (0.25, 0.18, 0.12)),
    "green": ((0.12, 0.32, 0.18), (0.22, 0.2, 0.19), (0.15, 0.12, 0.1)),
    "sky": ((0.45, 0.62, 0.82), (0.12, 0.14, 0.22), (0.2, 0.15, 0.1)),
    "khaki": ((0.55, 0.47, 0.3), (0.25, 0.22, 0.18), (0.2, 0.14, 0.09)),
}


def _tint_material(mat, rgb, name, plain=False):
    """plain=True replaces the printed texture with a solid fabric colour (keeps the normal map folds)."""
    m = mat.copy()
    m.name = name
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    sock = b.inputs["Base Color"]
    if plain:
        for l in list(sock.links):
            nt.links.remove(l)
        sock.default_value = (*rgb, 1)
        b.inputs["Roughness"].default_value = 0.85
        for l in list(b.inputs["Metallic"].links):
            nt.links.remove(l)
        b.inputs["Metallic"].default_value = 0.0
        return m
    if sock.links:
        src = sock.links[0].from_socket
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
        mix.inputs[0].default_value = 1.0
        nt.links.new(src, mix.inputs[6])
        mix.inputs[7].default_value = (*rgb, 1)
        nt.links.new(mix.outputs[2], sock)
    else:
        c = sock.default_value
        sock.default_value = (c[0] * rgb[0], c[1] * rgb[1], c[2] * rgb[2], 1)
    return m


class Person:
    _n = 0

    def __init__(self, outfit="hero", skin="brown", beard=True, loc=(0, 0, 0), heading=0.0, scale=1.0):
        Person._n += 1
        tag = f"P{Person._n}"
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=RPM)
        new = [o for o in bpy.data.objects if o not in before]
        for o in list(new):
            if o.type == "MESH" and (o.name.startswith("Icosphere") or "Headwear" in o.name or ("Beard" in o.name and not beard)):
                new.remove(o)
                bpy.data.objects.remove(o, do_unlink=True)
        self.arm = next(o for o in new if o.type == "ARMATURE")
        self.root = next(o for o in new if o.parent is None)
        self.root.name = tag
        self.meshes = [o for o in new if o.type == "MESH"]
        top, bottom, shoes = OUTFITS[outfit]
        s = SKIN[skin]
        for o in self.meshes:
            o.name = f"{tag}_{o.name}"
            for slot in o.material_slots:
                mn = slot.material.name
                if "Skin" in mn or "Body" in mn:
                    slot.material = _tint_material(slot.material, s, f"{tag}_{mn}")
                elif "Top" in mn:
                    slot.material = _tint_material(slot.material, top, f"{tag}_{mn}", plain=True)
                elif "Bottom" in mn:
                    slot.material = _tint_material(slot.material, bottom, f"{tag}_{mn}", plain=True)
                elif "Footwear" in mn:
                    slot.material = _tint_material(slot.material, shoes, f"{tag}_{mn}", plain=True)
                elif "Beard" in mn:
                    slot.material = _tint_material(slot.material, (0.25, 0.22, 0.2), f"{tag}_{mn}")
        self._add_hair(tag)
        self.root.location = loc
        self.root.rotation_mode = "XYZ"
        self.root.rotation_euler = (0, 0, heading)
        self.root.scale = (scale, scale, scale)
        for pb in self.arm.pose.bones:
            pb.rotation_mode = "QUATERNION"

    def _add_hair(self, tag):
        """Short dark haircut: a shaped cap bound to the head bone."""
        head = self.arm.data.bones["Head"]
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1.0)
        h = bpy.context.active_object
        h.name = f"{tag}_hair"
        for v in h.data.vertices:  # keep the upper/back part of the sphere
            if v.co.z < -0.15 and v.co.y < 0.2:
                v.co.z = -0.15 + (v.co.z + 0.15) * 0.2
            if v.co.y < -0.55 and v.co.z < 0.35:
                v.co.y = -0.55
        h.scale = (0.096, 0.108, 0.088)
        h.location = self.arm.matrix_world @ (head.head_local + Vector((0, 0.012, 0.135)))
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        for p in h.data.polygons:
            p.use_smooth = True
        mat = bpy.data.materials.get("HairDark")
        if mat is None:
            mat = bpy.data.materials.new("HairDark")
            mat.use_nodes = True
            bs = mat.node_tree.nodes["Principled BSDF"]
            bs.inputs["Base Color"].default_value = (0.02, 0.016, 0.014, 1)
            bs.inputs["Roughness"].default_value = 0.55
            nz = mat.node_tree.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 180
            bump = mat.node_tree.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.5
            mat.node_tree.links.new(nz.outputs["Fac"], bump.inputs["Height"])
            mat.node_tree.links.new(bump.outputs[0], bs.inputs["Normal"])
        h.data.materials.append(mat)
        mw = h.matrix_world.copy()
        h.parent = self.arm
        h.parent_type = "BONE"
        h.parent_bone = "Head"
        h.matrix_world = mw
        self.meshes.append(h)

    # ---------------------------------------------------------------- posing
    def pose(self, spec):
        """spec: {bone_name: direction in armature space}. Parents must come before children."""
        order = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head",
                 "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand", "RightShoulder", "RightArm", "RightForeArm", "RightHand",
                 "LeftUpLeg", "LeftLeg", "LeftFoot", "RightUpLeg", "RightLeg", "RightFoot"]
        pbs = self.arm.pose.bones
        for name in order:
            if name not in spec or name not in pbs:
                continue
            pb = pbs[name]
            pb.rotation_quaternion = Quaternion()
            bpy.context.view_layer.update()
            cur = pb.matrix.to_3x3()
            want = Vector(spec[name]).normalized()
            q = cur.col[1].normalized().rotation_difference(want)
            local = cur.inverted() @ q.to_matrix() @ cur
            pb.rotation_quaternion = local.to_quaternion()
        bpy.context.view_layer.update()

    def key(self, frame, spec, loc=None, rot=None):
        for pb in self.arm.pose.bones:
            pb.rotation_quaternion = Quaternion()
        self.pose(spec)
        for pb in self.arm.pose.bones:
            pb.keyframe_insert("rotation_quaternion", frame=frame)
        if loc is not None:
            self.root.location = loc
            self.root.keyframe_insert("location", frame=frame)
        if rot is not None:
            self.root.rotation_euler = rot
            self.root.keyframe_insert("rotation_euler", frame=frame)


# ---------------------------------------------------------------- pose library
def stand(sway=0.0):
    return {
        "Spine": (0, 0.02, 1), "Spine1": (0, 0.04, 1), "Spine2": (0, 0.02, 1), "Head": (0, -0.03 + sway * 0.02, 1),
        "LeftArm": (0.2, 0.02, -1), "LeftForeArm": (0.1, -0.2, -1), "LeftHand": (0.08, -0.2, -1),
        "RightArm": (-0.2, 0.02, -1), "RightForeArm": (-0.1, -0.2, -1), "RightHand": (-0.08, -0.2, -1),
        "LeftUpLeg": (0.06, 0, -1), "LeftLeg": (0.03, 0.03, -1), "LeftFoot": (0.02, -0.85, -0.5),
        "RightUpLeg": (-0.06, 0, -1), "RightLeg": (-0.03, 0.03, -1), "RightFoot": (-0.02, -0.85, -0.5),
    }


def walk(phase):
    s = math.sin(phase)
    c = math.cos(phase)
    def leg(sign, ph):
        sw = math.sin(ph)
        knee = max(0.0, math.sin(ph + 1.2)) * 0.9
        return (sign * 0.05, -0.5 * sw, -1), (sign * 0.03, -0.5 * sw + knee * 0.9, -1), (sign * 0.02, -0.9, -0.4)
    lu, ll, lf = leg(1, phase)
    ru, rl, rf = leg(-1, phase + math.pi)
    p = stand()
    p.update({
        "Spine": (0, -0.06, 1), "Head": (0, -0.08, 1),
        "LeftUpLeg": lu, "LeftLeg": ll, "LeftFoot": lf, "RightUpLeg": ru, "RightLeg": rl, "RightFoot": rf,
        "LeftArm": (0.18, 0.35 * s, -1), "LeftForeArm": (0.1, 0.3 * s - 0.35, -1),
        "RightArm": (-0.18, -0.35 * s, -1), "RightForeArm": (-0.1, -0.3 * s - 0.35, -1),
    })
    return p


def flail(t, rng_phase=0.0):
    """Thrown through the air: arms out and windmilling, legs bent and kicking."""
    a = t * 9 + rng_phase
    return {
        "Spine": (0, 0.25, 1), "Spine1": (0, 0.3, 1), "Spine2": (0, 0.2, 1), "Head": (0, 0.35, 1),
        "LeftArm": (1, 0.3 * math.sin(a), 0.35 + 0.5 * math.cos(a)), "LeftForeArm": (1, -0.2, 0.6 + 0.5 * math.sin(a * 1.3)),
        "RightArm": (-1, 0.3 * math.cos(a), 0.4 + 0.5 * math.sin(a * 0.9)), "RightForeArm": (-1, -0.3, 0.7 + 0.4 * math.cos(a)),
        "LeftUpLeg": (0.25, -0.45 + 0.4 * math.sin(a * 0.8), -1), "LeftLeg": (0.2, 0.6, -1), "LeftFoot": (0.1, -0.6, -0.6),
        "RightUpLeg": (-0.25, 0.3 * math.cos(a * 0.8), -1), "RightLeg": (-0.15, 0.4, -1), "RightFoot": (-0.1, -0.6, -0.6),
    }


def sit_ground(breath=0.0):
    return {
        "Spine": (0, 0.15, 1), "Spine1": (0, -0.05, 1), "Spine2": (0, -0.1, 1), "Head": (0, -0.2 + breath * 0.03, 1),
        "LeftUpLeg": (0.25, -1, 0.35), "LeftLeg": (0.05, 0.3, -1), "LeftFoot": (0.0, -0.9, -0.3),
        "RightUpLeg": (-0.25, -1, 0.3), "RightLeg": (-0.05, 0.25, -1), "RightFoot": (0.0, -0.9, -0.3),
        "LeftArm": (0.3, -0.5, -1), "LeftForeArm": (0.0, -1, -0.1),
        "RightArm": (-0.3, -0.5, -1), "RightForeArm": (0.0, -1, -0.15),
    }


def shield_eyes(t=0.0):
    p = stand()
    p.update({"Head": (0, -0.25, 1),
              "RightArm": (-0.55, -0.6, 0.15), "RightForeArm": (0.45, -0.3, 0.85), "RightHand": (0.6, -0.2, 0.3),
              "Spine2": (0, 0.05, 1)})
    return p


def hug_cold(t=0.0):
    sh = math.sin(t * 40) * 0.03
    p = stand()
    p.update({"Spine1": (0, -0.12, 1), "Spine2": (sh, -0.15, 1), "Head": (sh, -0.2, 1),
              "LeftArm": (0.3, -0.8, -0.6), "LeftForeArm": (-1, -0.2, 0.25),
              "RightArm": (-0.3, -0.8, -0.55), "RightForeArm": (1, -0.25, 0.3)})
    return p


def look_up():
    p = stand()
    p.update({"Head": (0, 0.6, 1), "Spine2": (0, 0.15, 1)})
    return p
