"""Procedural military rescue helicopter (forward = +X, up = +Z, metres) with cockpit interior.

Built from lofted superellipse cross-sections (subdivided), plus engine cowling, rotor system,
tail, skids, hoist with animatable cable, searchlight, beacons and decals.
`Heli` exposes the root empty (move/rotate it), `rotor`/`tail_rotor` (keyed spin), `cable`, lights,
the seated pilot (`pilot`) and the cockpit camera anchors.
"""
import math, os
import bpy, bmesh
from mathutils import Vector, Matrix
import common
from common import new_mat, link_obj, set_mat, principled, emission_mat
from india import MB

LF_TEX = os.path.join(common.VIDEO, "public", "lastflight", "textures")

# fuselage sections: x, z-centre, half-width, half-height
SECTIONS = [
    (3.45, 1.12, 0.08, 0.10), (3.30, 1.15, 0.42, 0.42), (3.00, 1.22, 0.72, 0.72), (2.55, 1.32, 0.95, 0.92),
    (1.90, 1.42, 1.10, 1.05), (1.00, 1.48, 1.18, 1.12), (0.00, 1.52, 1.20, 1.15), (-1.00, 1.56, 1.18, 1.12),
    (-1.90, 1.66, 1.02, 0.95), (-2.60, 1.82, 0.66, 0.62), (-3.20, 1.95, 0.40, 0.42), (-5.00, 2.02, 0.30, 0.32),
    (-7.00, 2.10, 0.22, 0.24), (-8.20, 2.16, 0.17, 0.20), (-8.45, 2.17, 0.06, 0.08),
]
RING = 28


def _sec_point(a, w, h, p=2.6):
    c, s = math.cos(a), math.sin(a)
    y = w * math.copysign(abs(c) ** (2 / p), c)
    z = h * math.copysign(abs(s) ** (2 / p), s)
    return y, z


def paint_material(name="HeliPaint", base=(0.17, 0.19, 0.17)):
    """Military paint: panel seams, rivet-line bump, exhaust soot and dust grime."""
    m, n, l, out = new_mat(name)
    tc = n.new("ShaderNodeTexCoord")
    br = n.new("ShaderNodeTexBrick"); br.inputs["Scale"].default_value = 0.9
    br.inputs["Mortar Size"].default_value = 0.004; br.inputs["Brick Width"].default_value = 1.1; br.inputs["Row Height"].default_value = 0.55
    br.inputs["Color1"].default_value = (*base, 1); br.inputs["Color2"].default_value = (base[0] * 0.93, base[1] * 0.93, base[2] * 0.95, 1)
    br.inputs["Mortar"].default_value = (base[0] * 0.5, base[1] * 0.5, base[2] * 0.5, 1)
    l.new(tc.outputs["Object"], br.inputs[0])
    nz = n.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 1.5; nz.inputs["Detail"].default_value = 8
    l.new(tc.outputs["Object"], nz.inputs[0])
    grime = n.new("ShaderNodeMix"); grime.data_type = "RGBA"; grime.blend_type = "MULTIPLY"
    gr = n.new("ShaderNodeMapRange"); gr.inputs[1].default_value = 0.45; gr.inputs[2].default_value = 0.75
    l.new(nz.outputs["Fac"], gr.inputs[0]); l.new(gr.outputs[0], grime.inputs[0])
    l.new(br.outputs["Color"], grime.inputs[6]); grime.inputs[7].default_value = (0.55, 0.5, 0.42, 1)
    b = n.new("ShaderNodeBsdfPrincipled")
    l.new(grime.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.55; b.inputs["Metallic"].default_value = 0.25
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35; bump.invert = True
    l.new(br.outputs["Fac"], bump.inputs["Height"]); l.new(bump.outputs[0], b.inputs["Normal"])
    l.new(b.outputs[0], out.inputs[0])
    return m


def decal_material(file, name, emit=0.0):
    m, n, l, out = new_mat(name)
    t = n.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(os.path.join(LF_TEX, file), check_existing=True)
    b = n.new("ShaderNodeBsdfPrincipled"); b.inputs["Roughness"].default_value = 0.5
    l.new(t.outputs["Color"], b.inputs["Base Color"])
    if emit:
        l.new(t.outputs["Color"], b.inputs["Emission Color"]); b.inputs["Emission Strength"].default_value = emit
    tr = n.new("ShaderNodeBsdfTransparent"); mix = n.new("ShaderNodeMixShader")
    l.new(t.outputs["Alpha"], mix.inputs[0]); l.new(tr.outputs[0], mix.inputs[1]); l.new(b.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], out.inputs[0])
    return m


def glass_material(name="Canopy"):
    """Clear canopy: mostly see-through with a Fresnel-weighted reflection (reads clearly from inside and out)."""
    m, n, l, out = new_mat(name)
    tr = n.new("ShaderNodeBsdfTransparent"); tr.inputs["Color"].default_value = (0.86, 0.9, 0.9, 1)
    gl = n.new("ShaderNodeBsdfGlossy"); gl.inputs["Roughness"].default_value = 0.03
    lw = n.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.25
    mr = n.new("ShaderNodeMapRange"); mr.inputs[3].default_value = 0.12; mr.inputs[4].default_value = 0.85
    l.new(lw.outputs["Fresnel"], mr.inputs[0])
    mix = n.new("ShaderNodeMixShader")
    l.new(mr.outputs[0], mix.inputs[0]); l.new(tr.outputs[0], mix.inputs[1]); l.new(gl.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], out.inputs[0])
    return m


class Heli:
    def __init__(self, name="Heli", paint=(0.17, 0.19, 0.17), with_pilot=True, door_open=True, cable=True):
        M = {}
        M["paint"] = paint_material(name + "_paint", paint)
        M["orange"] = principled(name + "_orange", (0.95, 0.32, 0.03), rough=0.5)
        M["glass"] = glass_material(name + "_glass")
        M["dark"] = principled(name + "_dark", (0.02, 0.02, 0.02), rough=0.6)
        M["metal"] = principled(name + "_metal", (0.35, 0.35, 0.36), rough=0.3, metal=1.0)
        M["blade"] = principled(name + "_blade", (0.04, 0.04, 0.045), rough=0.4)
        M["inside"] = principled(name + "_inside", (0.06, 0.065, 0.06), rough=0.8)
        M["red"] = emission_mat(name + "_beacon", (1.0, 0.05, 0.02), 40)
        M["green"] = emission_mat(name + "_navg", (0.1, 1.0, 0.2), 15)
        M["navr"] = emission_mat(name + "_navr", (1.0, 0.05, 0.05), 15)
        M["white"] = emission_mat(name + "_strobe", (1.0, 1.0, 1.0), 80)
        M["lamp"] = emission_mat(name + "_lamp", (1.0, 0.95, 0.85), 60)
        self.M = M
        self.root = bpy.data.objects.new(name, None); link_obj(self.root)
        self._fuselage(name)
        self._details(name)
        self._rotors(name)
        if cable:
            self._hoist(name)
        self._decals(name)
        self._cockpit(name)
        self.pilot = None
        if with_pilot:
            self._pilot(name)

    # ------------------------------------------------------------------ geometry
    def _fuselage(self, name):
        bm = bmesh.new()
        rings = []
        for (x, zc, w, h) in SECTIONS:
            ring = []
            for i in range(RING):
                a = 2 * math.pi * i / RING
                y, z = _sec_point(a, w, h)
                ring.append(bm.verts.new((x, y, zc + z)))
            rings.append(ring)
        for r0, r1 in zip(rings[:-1], rings[1:]):
            for i in range(RING):
                j = (i + 1) % RING
                bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        # material zones: canopy glass, cabin windows, open door, orange band
        for f in bm.faces:
            c = f.calc_center_median()
            zc = _zc(c.x)
            rel = c.z - zc
            mat = 0
            if 0.95 < c.x < 3.25 and rel > -0.12 and abs(c.y) < 1.2:
                mat = 2  # cockpit glazing
            elif -1.6 < c.x < 0.9 and 0.12 < rel < 0.7 and abs(c.y) > 0.8:
                mat = 2  # cabin windows
            if -1.5 < c.x < 0.7 and -0.75 < rel < 0.7 and c.y < -0.85:
                mat = 3  # open sliding door: dark cabin interior
            if -3.0 < c.x < -2.2 and abs(c.y) > 0.1:
                mat = 1  # orange rescue band
            if -7.6 < c.x < -6.6:
                mat = 1
            f.material_index = mat
            f.smooth = True
        me = bpy.data.meshes.new(name + "_fuse"); bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new(name + "_fuse", me); link_obj(ob)
        for m in (self.M["paint"], self.M["orange"], self.M["glass"], self.M["inside"]):
            ob.data.materials.append(m)
        sub = ob.modifiers.new("sub", "SUBSURF"); sub.levels = 1; sub.render_levels = 2
        ob.parent = self.root
        self.fuse = ob
        # canopy frame bars
        mb = MB()
        for x in (3.05, 2.45, 1.85):
            z = _zc(x)
            mb.box((x, 0, z + 0.62), (0.06, 1.6, 0.06), 0)
        mb.box((2.5, 0, _zc(2.5) + 0.86), (1.6, 0.06, 0.06), 0)
        bars = mb.build(name + "_frames", [self.M["dark"]]); bars.parent = self.root

    def _details(self, name):
        M = self.M
        mb = MB()
        mb.box((-0.4, 0, 2.88), (2.9, 1.25, 0.55), 0)            # engine cowling
        mb.box((0.9, 0, 2.75), (0.6, 1.0, 0.35), 0)
        for sy in (0.55, -0.55):
            mb.cyl((-1.95, sy, 2.85), 0.17, 0.55, 1, seg=14, axis="X")   # exhausts
        mb.box((-7.95, 0.0, 2.95), (0.85, 0.12, 1.5), 0)          # vertical fin
        mb.box((-6.9, 0.0, 2.15), (0.55, 2.8, 0.06), 0)           # horizontal stabiliser
        for sy in (1.05, -1.05):                                   # skids + struts
            mb.cyl((0.1, sy, 0.06), 0.06, 4.0, 2, seg=10, axis="X")
            mb.box((1.2, sy * 0.9, 0.45), (0.08, 0.08, 0.85), 2)
            mb.box((-1.0, sy * 0.9, 0.45), (0.08, 0.08, 0.85), 2)
        mb.cyl((3.15, 0, 0.72), 0.16, 0.28, 3, seg=16)           # searchlight body
        mb.cyl((3.15, 0, 0.56), 0.13, 0.04, 4, seg=16)           # searchlight lens
        mb.cyl((0.0, 0, 3.35), 0.12, 0.7, 2, seg=12)              # mast
        ob = mb.build(name + "_details", [M["paint"], M["dark"], M["metal"], M["dark"], M["lamp"]]); ob.parent = self.root
        for p in ob.data.polygons:
            p.use_smooth = True
        md = ob.modifiers.new("bev", "BEVEL"); md.width = 0.06; md.segments = 2; md.limit_method = "ANGLE"
        # lights
        self.beacons = []
        for (loc, mat, nm) in (((0.2, 0, 3.18), M["red"], "beacon_top"), ((0.2, 0, 0.42), M["red"], "beacon_low"),
                               ((-8.4, 0, 3.7), M["white"], "strobe"), ((0.3, 1.25, 1.3), M["green"], "nav_g"), ((0.3, -1.25, 1.3), M["navr"], "nav_r")):
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.07, location=loc, segments=12, ring_count=6)
            b = bpy.context.active_object; b.name = name + "_" + nm; set_mat(b, mat); b.parent = self.root; b.visible_shadow = False
            self.beacons.append(b)
        ld = bpy.data.lights.new(name + "_search", "SPOT"); ld.energy = 6000; ld.spot_size = math.radians(18); ld.color = (1, 0.95, 0.85)
        ld.spot_blend = 0.4; ld.shadow_soft_size = 0.1
        sl = bpy.data.objects.new(name + "_search", ld); link_obj(sl); sl.location = (3.15, 0, 0.5)
        sl.rotation_euler = (0, math.radians(35), 0); sl.parent = self.root
        self.searchlight = sl

    def _rotors(self, name):
        M = self.M
        self.rotor = bpy.data.objects.new(name + "_rotor", None); link_obj(self.rotor)
        self.rotor.location = (0.0, 0, 3.72); self.rotor.parent = self.root
        mb = MB()
        mb.cyl((0, 0, 0), 0.32, 0.22, 0, seg=16)
        for k in range(4):
            a = k * math.pi / 2
            for s in range(6):  # blade with slight droop and taper
                r0 = 0.4 + s * 1.05
                c = (math.cos(a) * (r0 + 0.52), math.sin(a) * (r0 + 0.52), -0.012 * s * s)
                mb.box(c, (1.06, 0.42 - 0.02 * s, 0.05), 1, rz=a)
        ob = mb.build(name + "_blades", [M["metal"], M["blade"]]); ob.parent = self.rotor
        self.tail_rotor = bpy.data.objects.new(name + "_tailrotor", None); link_obj(self.tail_rotor)
        self.tail_rotor.location = (-8.15, 0.32, 3.0); self.tail_rotor.parent = self.root
        mb = MB()
        mb.cyl((0, 0, 0), 0.1, 0.16, 0, seg=12, axis="Y")
        mb.box((0, 0, 0), (2.6, 0.03, 0.17), 1)   # two crossed blade pairs in the XZ disc
        mb.box((0, 0, 0), (0.17, 0.03, 2.6), 1)
        ob2 = mb.build(name + "_tailblades", [M["metal"], M["blade"]])
        ob2.parent = self.tail_rotor

    def _hoist(self, name):
        M = self.M
        mb = MB()
        mb.box((-0.2, -1.3, 2.55), (0.3, 0.9, 0.12), 0)      # hoist boom over the door
        mb.cyl((-0.2, -1.72, 2.45), 0.14, 0.32, 0, seg=14, axis="Y")
        ob = mb.build(name + "_hoist", [M["metal"]]); ob.parent = self.root
        bpy.ops.mesh.primitive_cylinder_add(radius=0.012, depth=1.0, vertices=8, location=(0, 0, -0.5))
        c = bpy.context.active_object; c.name = name + "_cable"
        bpy.ops.object.transform_apply(location=True)
        set_mat(c, principled(name + "_cablemat", (0.08, 0.08, 0.08), rough=0.5, metal=0.6))
        c.location = (-0.2, -1.72, 2.4); c.parent = self.root
        self.cable = c
        # harness (bright orange strop) at the cable end
        mb = MB()
        mb.box((0, 0, 0), (0.5, 0.08, 0.35), 0)
        mb.box((0, 0, 0.22), (0.12, 0.12, 0.12), 1)
        h = mb.build(name + "_harness", [M["orange"], M["metal"]])
        self.harness = h

    def set_cable(self, frame, length, swing=(0.0, 0.0)):
        """Cable hangs from the hoist; `length` metres; swing = small rotation (x, y) in radians."""
        self.cable.scale = (1, 1, max(0.01, length))
        self.cable.rotation_euler = (swing[0], swing[1], 0)
        self.cable.keyframe_insert("scale", frame=frame)
        self.cable.keyframe_insert("rotation_euler", frame=frame)
        bpy.context.view_layer.update()
        end = self.cable.matrix_world @ Vector((0, 0, -1.0))
        self.harness.location = end
        self.harness.rotation_euler = self.root.matrix_world.to_euler()
        self.harness.keyframe_insert("location", frame=frame)
        self.harness.keyframe_insert("rotation_euler", frame=frame)

    def _decals(self, name):
        def plane(file, loc, size, rot, nm):
            bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
            p = bpy.context.active_object; p.name = name + nm; p.scale = (*size, 1)
            set_mat(p, decal_material(file, name + nm))
            p.parent = self.root
            p.visible_shadow = False
            return p
        for side in (1, -1):
            plane("rescue_side.png", (-5.5, side * 0.33, 2.07), (1.7, 0.42), (math.pi / 2, 0, 0 if side < 0 else math.pi), f"_rescue{side}")
            plane("roundel.png", (-1.9, side * 1.06, 1.85), (0.55, 0.55), (math.pi / 2, 0, 0 if side < 0 else math.pi), f"_roundel{side}")
            plane("tail_number.png", (-4.15, side * 0.36, 2.04), (0.9, 0.22), (math.pi / 2, 0, 0 if side < 0 else math.pi), f"_tailno{side}")

    def _cockpit(self, name):
        M = self.M
        def mfd(file, loc, nm, emit=3.0):
            # face the pilot (-X), image upright, tilted back 20 degrees
            bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=(math.radians(70), 0, math.radians(-90)))
            p = bpy.context.active_object; p.name = name + nm; p.scale = (0.32, 0.24, 1)
            m, n, l, out = new_mat(name + nm + "_m")
            t = n.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(os.path.join(LF_TEX, file), check_existing=True)
            e = n.new("ShaderNodeEmission"); l.new(t.outputs[0], e.inputs[0]); e.inputs[1].default_value = emit
            l.new(e.outputs[0], out.inputs[0]); set_mat(p, m); p.parent = self.root
            return p, e
        mb = MB()
        mb.box((2.55, 0, 1.32), (0.5, 1.9, 0.55), 0)       # instrument panel
        mb.box((2.75, 0, 1.62), (0.35, 1.9, 0.08), 0)      # glare shield
        mb.box((1.9, 0, 0.95), (0.9, 0.3, 0.3), 0)         # centre console
        for sy in (0.45, -0.45):
            mb.box((1.15, sy, 0.95), (0.6, 0.55, 0.12), 1)   # seats
            mb.box((0.88, sy, 1.45), (0.12, 0.55, 0.9), 1)
        mb.cyl((1.75, -0.45, 1.05), 0.025, 0.55, 2, seg=10)  # cyclic (pilot sits right)
        mb.box((1.75, -0.45, 1.34), (0.06, 0.05, 0.12), 0)
        pan = mb.build(name + "_cockpit", [M["dark"], M["inside"], M["metal"]]); pan.parent = self.root
        self.mfds = [mfd("mfd_warn.png", (2.26, -0.42, 1.4), "_mfd1"), mfd("mfd_horizon.png", (2.26, 0.0, 1.4), "_mfd2"),
                     mfd("mfd_map.png", (2.26, 0.42, 1.4), "_mfd3")]
        # red master-warning lamps on the glare shield
        self.warn = []
        for k, sy in enumerate((-0.6, -0.3, 0.3, 0.6)):
            bpy.ops.mesh.primitive_cube_add(size=1, location=(2.6, sy, 1.68))
            w = bpy.context.active_object; w.scale = (0.05, 0.12, 0.04); w.name = f"{name}_warn{k}"
            set_mat(w, emission_mat(f"{name}_warnm{k}", (1.0, 0.05, 0.02), 25)); w.parent = self.root
            self.warn.append(w)
        ld = bpy.data.lights.new(name + "_redfill", "POINT"); ld.energy = 5; ld.color = (1.0, 0.12, 0.05); ld.shadow_soft_size = 0.3
        lf = bpy.data.objects.new(name + "_redfill", ld); link_obj(lf); lf.location = (2.3, -0.2, 1.75); lf.parent = self.root
        self.redfill = lf

    def _pilot(self, name):
        import character as C
        p = C.Person("pilot", "brown", beard=False, loc=(0, 0, 0), heading=0.0)
        self.pilot = p
        # seated facing +X: character faces -Y at heading 0 -> heading +90 deg
        p.root.location = (1.05, -0.45, 0.1)
        p.root.rotation_euler = (0, 0, math.radians(90))
        p.root.parent = self.root
        p.pose(pilot_pose(0.0))
        for o in p.meshes:  # flight gloves: the avatar's body mesh carries the hands
            if o.name.endswith("Wolf3D_Body"):
                for s in o.material_slots:
                    b = next(n for n in s.material.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
                    for lk in list(b.inputs["Base Color"].links):
                        s.material.node_tree.links.remove(lk)
                    b.inputs["Base Color"].default_value = (0.03, 0.03, 0.028, 1)
                    b.inputs["Roughness"].default_value = 0.7
        add_helmet(p)


def _zc(x):
    """Fuselage centre height interpolated along x."""
    s = SECTIONS
    if x >= s[0][0]:
        return s[0][1]
    for (x0, z0, _, _), (x1, z1, _, _) in zip(s[:-1], s[1:]):
        if x1 <= x <= x0:
            t = (x - x0) / (x1 - x0)
            return z0 + (z1 - z0) * t
    return s[-1][1]


def pilot_pose(t, struggle=0.0):
    """Seated, right hand on the cyclic, left on the collective; struggle adds jolts."""
    j = struggle * math.sin(t * 23) * 0.12
    return {
        "Spine": (0, -0.05 + j * 0.3, 1), "Spine1": (0, -0.08, 1), "Spine2": (j * 0.4, -0.05, 1), "Head": (j * 0.6, -0.12 - j * 0.5, 1),
        "LeftUpLeg": (0.2, -1, 0.05), "LeftLeg": (0.05, -0.2, -1), "LeftFoot": (0, -1, -0.2),
        "RightUpLeg": (-0.2, -1, 0.05), "RightLeg": (-0.05, -0.2, -1), "RightFoot": (0, -1, -0.2),
        "RightArm": (-0.25, -0.55, -0.8), "RightForeArm": (0.05 + j, -1.0, -0.15), "RightHand": (0.05, -1, -0.3),
        "LeftArm": (0.4, -0.25, -0.9), "LeftForeArm": (0.3, -1.0, -0.35 + j), "LeftHand": (0.2, -1, -0.4),
    }


def add_helmet(person, visor_down=True):
    """Flight helmet with tinted reflective visor and boom microphone, bound to the head bone."""
    arm = person.arm
    bpy.context.view_layer.update()
    pb = arm.pose.bones["Head"]
    # posed head position + the head's own "up" (bone Y axis) so the helmet sits on the skull
    up = (arm.matrix_world.to_3x3() @ pb.matrix.to_3x3() @ Vector((0, 1, 0))).normalized()
    hc = arm.matrix_world @ pb.head + up * 0.11
    shell = principled("HelmetShell", (0.18, 0.2, 0.17), rough=0.35)
    visor = principled("Visor", (0.01, 0.01, 0.012), rough=0.02, metal=0.9, spec=1.0)
    mic = principled("Mic", (0.02, 0.02, 0.02), rough=0.5)
    parts = []
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.132, segments=32, ring_count=16, location=hc)
    s = bpy.context.active_object; s.name = person.root.name + "_helmet"; s.scale = (1.0, 1.08, 1.0)
    for v in s.data.vertices:
        if v.co.z < -0.06:
            v.co.z = -0.06 + (v.co.z + 0.06) * 0.35
    set_mat(s, shell); parts.append(s)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.139, segments=32, ring_count=16, location=hc)
    vz = bpy.context.active_object; vz.name = person.root.name + "_visor"
    import bmesh as _bm
    bm = _bm.new(); bm.from_mesh(vz.data)
    kill = [v for v in bm.verts if not (v.co.y < -0.05 and -0.11 < v.co.z < 0.05)]  # front band only (face is -Y)
    _bm.ops.delete(bm, geom=kill, context="VERTS"); bm.to_mesh(vz.data); bm.free()
    sol = vz.modifiers.new("t", "SOLIDIFY"); sol.thickness = 0.006
    set_mat(vz, visor); parts.append(vz)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.008, depth=0.16, location=hc + Vector((-0.11, -0.08, -0.1)), rotation=(math.radians(60), 0, math.radians(-30)))
    m = bpy.context.active_object; set_mat(m, mic); parts.append(m)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.018, location=hc + Vector((-0.06, -0.15, -0.13)))
    m2 = bpy.context.active_object; set_mat(m2, mic); parts.append(m2)
    for o in parts:
        for p in o.data.polygons:
            p.use_smooth = True
        mw = o.matrix_world.copy()
        o.parent = arm; o.parent_type = "BONE"; o.parent_bone = "Head"
        o.matrix_world = mw
    # hide the hair cap under the helmet
    for o in person.meshes:
        if o.name.endswith("_hair"):
            o.hide_render = True
    person.helmet = parts
    return parts


def key_rotors(h, frames, rpm=290, tail_rpm=1500):
    for f in frames:
        h.rotor.rotation_euler = (0, 0, -2 * math.pi * rpm / 60 * f / common.FPS)
        h.rotor.keyframe_insert("rotation_euler", frame=f)
        h.tail_rotor.rotation_euler = (0, 2 * math.pi * tail_rpm / 60 * f / common.FPS, 0)
        h.tail_rotor.keyframe_insert("rotation_euler", frame=f)
    common.linear_keys(h.rotor)
    common.linear_keys(h.tail_rotor)


def key_beacons(h, frames):
    """Anti-collision beacon/strobe blink by scaling the emitters."""
    for f in frames:
        on = (f // 3) % 8 == 0
        for b in h.beacons[:3]:
            s = 1.0 if on else 0.01
            b.scale = (s, s, s)
            b.keyframe_insert("scale", frame=f)


def key_path(h, frames, pos_fn, yaw_fn, pitch_fn=lambda f: 0.0, roll_fn=lambda f: 0.0):
    for f in frames:
        h.root.location = pos_fn(f)
        h.root.rotation_euler = (roll_fn(f), pitch_fn(f), yaw_fn(f))
        h.root.keyframe_insert("location", frame=f)
        h.root.keyframe_insert("rotation_euler", frame=f)
