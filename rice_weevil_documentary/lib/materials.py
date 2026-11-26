"""Procedural, physically based materials (no image textures needed -> nothing can go missing)."""
import bpy


class NB:
    """Tiny node-graph builder."""

    def __init__(self, mat):
        mat.use_nodes = True
        self.mat = mat
        self.nt = mat.node_tree
        self.nt.nodes.clear()
        self.x = 0

    def n(self, typ, **inputs):
        node = self.nt.nodes.new(typ)
        node.location = (self.x, 0)
        self.x += 200
        for k, v in inputs.items():
            if k.startswith("_"):
                setattr(node, k[1:], v)
            else:
                node.inputs[k].default_value = v
        return node

    def l(self, a, b):
        self.nt.links.new(a, b)

    def math(self, op, a=None, b=None, va=0.0, vb=0.0, clamp=False):
        m = self.n("ShaderNodeMath", _operation=op, _use_clamp=clamp)
        m.inputs[0].default_value = va
        m.inputs[1].default_value = vb
        if a is not None:
            self.l(a, m.inputs[0])
        if b is not None:
            self.l(b, m.inputs[1])
        return m.outputs[0]

    def mix_rgb(self, fac, c1, c2, blend='MIX'):
        m = self.n("ShaderNodeMix", _data_type='RGBA', _blend_type=blend)
        if isinstance(fac, (int, float)):
            m.inputs["Factor"].default_value = fac
        else:
            self.l(fac, m.inputs["Factor"])
        for sock, c in ((m.inputs[6], c1), (m.inputs[7], c2)):
            if isinstance(c, tuple):
                sock.default_value = c
            else:
                self.l(c, sock)
        return m.outputs[2]

    def output(self, shader_socket, disp=None):
        out = self.n("ShaderNodeOutputMaterial")
        self.l(shader_socket, out.inputs["Surface"])
        return out


def _bsdf(nb, **kw):
    p = nb.n("ShaderNodeBsdfPrincipled")
    p.subsurface_method = 'BURLEY'  # much cheaper than random walk on CPU
    for k, v in kw.items():
        p.inputs[k].default_value = v
    return p


def _bump(nb, height_socket, strength, distance, normal=None):
    b = nb.n("ShaderNodeBump")
    b.inputs["Strength"].default_value = strength
    b.inputs["Distance"].default_value = distance
    nb.l(height_socket, b.inputs["Height"])
    if normal is not None:
        nb.l(normal, b.inputs["Normal"])
    return b.outputs["Normal"]


def _coords(nb):
    return nb.n("ShaderNodeTexCoord").outputs["Object"]


# --------------------------------------------------------------------------- rice
def rice_material(name="Rice", aged=0.0, xray=None):
    """Polished rice: translucent starchy body, faint longitudinal ridges, chalky patches.

    aged > 0 adds yellowing + feeding stains (infested grain).
    xray: name of a Value node that fades the grain to a translucent 'cutaway' look.
    """
    mat = bpy.data.materials.new(name)
    nb = NB(mat)
    co = _coords(nb)
    # large-scale chalkiness
    n1 = nb.n("ShaderNodeTexNoise", Scale=0.9, Detail=6.0, Roughness=0.55)
    nb.l(co, n1.inputs["Vector"])
    # fine starch speckle
    n2 = nb.n("ShaderNodeTexNoise", Scale=28.0, Detail=4.0, Roughness=0.6)
    nb.l(co, n2.inputs["Vector"])
    # longitudinal ridges (grain runs along X)
    wave = nb.n("ShaderNodeTexWave", _wave_type='BANDS', _bands_direction='Y', Scale=1.6,
                Distortion=2.0, Detail=3.0)
    wave2 = nb.n("ShaderNodeTexWave", _wave_type='BANDS', _bands_direction='Z', Scale=1.4,
                 Distortion=2.5, Detail=3.0)
    nb.l(co, wave.inputs["Vector"])
    nb.l(co, wave2.inputs["Vector"])
    ridges = nb.math('MULTIPLY', wave.outputs["Fac"], wave2.outputs["Fac"])
    chalk = nb.n("ShaderNodeMapRange", **{"From Min": 0.45, "From Max": 0.7})
    nb.l(n1.outputs["Fac"], chalk.inputs["Value"])
    base = nb.mix_rgb(chalk.outputs[0], (0.70, 0.67, 0.60, 1), (0.90, 0.89, 0.85, 1))
    if aged > 0:
        stain_n = nb.n("ShaderNodeTexNoise", Scale=2.2, Detail=8.0, Roughness=0.7)
        nb.l(co, stain_n.inputs["Vector"])
        stain = nb.n("ShaderNodeMapRange", **{"From Min": 0.5, "From Max": 0.68})
        nb.l(stain_n.outputs["Fac"], stain.inputs["Value"])
        sf = nb.math('MULTIPLY', stain.outputs[0], None, vb=aged)
        base = nb.mix_rgb(sf, base, (0.55, 0.45, 0.30, 1))
        base = nb.mix_rgb(aged * 0.35, base, (0.80, 0.72, 0.52, 1))
    p = _bsdf(nb, **{"Roughness": 0.42, "Subsurface Weight": 0.65, "Subsurface Scale": 0.35,
                     "Subsurface Radius": (1.0, 0.85, 0.6), "Specular IOR Level": 0.45,
                     "Coat Weight": 0.08, "Coat Roughness": 0.3})
    nb.l(base, p.inputs["Base Color"])
    rough = nb.n("ShaderNodeMapRange", **{"To Min": 0.32, "To Max": 0.62})
    nb.l(n2.outputs["Fac"], rough.inputs["Value"])
    nb.l(rough.outputs[0], p.inputs["Roughness"])
    h = nb.math('ADD', ridges, n2.outputs["Fac"])
    nb.l(_bump(nb, h, 0.35, 0.025), p.inputs["Normal"])
    shader = p.outputs[0]
    if xray:
        # fresnel-weighted translucency: centre goes see-through, silhouette stays
        lw = nb.n("ShaderNodeLayerWeight", Blend=0.35)
        val = nb.n("ShaderNodeValue", _name=xray, _label=xray)
        val.outputs[0].default_value = 0.0
        edge = nb.math('POWER', lw.outputs["Facing"], None, vb=1.6)
        inv = nb.math('SUBTRACT', None, edge, va=1.0)
        fac = nb.math('MULTIPLY', inv, val.outputs[0], clamp=True)
        glass = _bsdf(nb, **{"Base Color": (0.85, 0.95, 1.0, 1), "Roughness": 0.15,
                             "Transmission Weight": 1.0, "IOR": 1.02,
                             "Emission Color": (0.5, 0.85, 1.0, 1), "Emission Strength": 0.0})
        tr = nb.n("ShaderNodeBsdfTransparent")
        tmix = nb.n("ShaderNodeMixShader")
        nb.l(edge, tmix.inputs[0])
        nb.l(tr.outputs[0], tmix.inputs[1])
        nb.l(glass.outputs[0], tmix.inputs[2])
        mix = nb.n("ShaderNodeMixShader")
        nb.l(fac, mix.inputs[0])
        nb.l(shader, mix.inputs[1])
        nb.l(tmix.outputs[0], mix.inputs[2])
        shader = mix.outputs[0]
    nb.output(shader)
    return mat


def endosperm_material(name="Endosperm"):
    """Exposed cut face / tunnel walls: chalky starch with granular texture."""
    mat = bpy.data.materials.new(name)
    nb = NB(mat)
    co = _coords(nb)
    vor = nb.n("ShaderNodeTexVoronoi", Scale=55.0, Randomness=1.0)
    nb.l(co, vor.inputs["Vector"])
    n1 = nb.n("ShaderNodeTexNoise", Scale=6.0, Detail=8.0)
    nb.l(co, n1.inputs["Vector"])
    col = nb.mix_rgb(n1.outputs["Fac"], (0.86, 0.84, 0.78, 1), (0.97, 0.96, 0.93, 1))
    p = _bsdf(nb, **{"Roughness": 0.85, "Subsurface Weight": 0.5, "Subsurface Scale": 0.25,
                     "Subsurface Radius": (1.0, 0.9, 0.7)})
    nb.l(col, p.inputs["Base Color"])
    h = nb.math('ADD', vor.outputs["Distance"], n1.outputs["Fac"])
    nb.l(_bump(nb, h, 0.35, 0.03), p.inputs["Normal"])
    nb.output(p.outputs[0])
    return mat


def frass_material(name="Frass"):
    mat = bpy.data.materials.new(name)
    nb = NB(mat)
    p = _bsdf(nb, **{"Base Color": (0.9, 0.88, 0.82, 1), "Roughness": 0.9})
    nb.output(p.outputs[0])
    return mat


# --------------------------------------------------------------------------- insect
def cuticle_material(name, base=(0.075, 0.03, 0.014, 1), punct_scale=38.0, punct_strength=0.55,
                     spots=False, striae=False, sclerotize_value=None, teneral=(0.42, 0.2, 0.09, 1)):
    """Weevil exoskeleton: glossy chitin, round punctures, optional pale elytral spots and striae.

    sclerotize_value: name of a Value node (0 = pale teneral/pupal colour, 1 = mature colour).
    """
    mat = bpy.data.materials.new(name)
    nb = NB(mat)
    co = _coords(nb)
    vor = nb.n("ShaderNodeTexVoronoi", Scale=punct_scale, Randomness=0.65,
               _feature='DISTANCE_TO_EDGE')
    nb.l(co, vor.inputs["Vector"])
    pits = nb.n("ShaderNodeMapRange", **{"From Min": 0.0, "From Max": 0.12})
    nb.l(vor.outputs["Distance"], pits.inputs["Value"])
    n1 = nb.n("ShaderNodeTexNoise", Scale=4.0, Detail=6.0)
    nb.l(co, n1.inputs["Vector"])
    col = nb.mix_rgb(n1.outputs["Fac"], base,
                     (base[0] * 1.7, base[1] * 1.5, base[2] * 1.3, 1))
    height = pits.outputs[0]
    if striae:
        # rows of pits running along the elytra (along X)
        sep = nb.n("ShaderNodeSeparateXYZ")
        nb.l(co, sep.inputs[0])
        s = nb.math('MULTIPLY', sep.outputs[1], None, vb=26.0)
        s = nb.math('SINE', s)
        s = nb.math('ABSOLUTE', s)
        height = nb.math('MULTIPLY', height, s)
    if spots:
        # 4 pale reddish-yellow spots: two per elytron (shoulder + apical third)
        sep = nb.n("ShaderNodeSeparateXYZ")
        nb.l(co, sep.inputs[0])
        ay = nb.math('ABSOLUTE', sep.outputs[1])
        total = None
        for cx, cy, rx, ry in ((0.40, 0.22, 0.13, 0.085), (-0.40, 0.20, 0.15, 0.09)):
            dx = nb.math('DIVIDE', nb.math('SUBTRACT', sep.outputs[0], None, vb=cx), None, vb=rx)
            dy = nb.math('DIVIDE', nb.math('SUBTRACT', ay, None, vb=cy), None, vb=ry)
            d = nb.math('ADD', nb.math('MULTIPLY', dx, dx), nb.math('MULTIPLY', dy, dy))
            total = d if total is None else nb.math('MINIMUM', total, d)
        n2 = nb.n("ShaderNodeTexNoise", Scale=9.0, Detail=4.0)
        nb.l(co, n2.inputs["Vector"])
        dist = nb.math('ADD', total, nb.math('MULTIPLY', n2.outputs["Fac"], None, vb=0.6))
        m = nb.n("ShaderNodeMapRange", **{"From Min": 1.25, "From Max": 0.85})
        nb.l(dist, m.inputs["Value"])
        spot = nb.math('MULTIPLY', m.outputs[0], None, vb=0.85)
        col = nb.mix_rgb(spot, col, (0.19, 0.06, 0.018, 1))
    if sclerotize_value:
        val = nb.n("ShaderNodeValue", _name=sclerotize_value, _label=sclerotize_value)
        val.outputs[0].default_value = 1.0
        col = nb.mix_rgb(val.outputs[0], teneral, col)
    p = _bsdf(nb, **{"Roughness": 0.3, "Coat Weight": 0.6, "Coat Roughness": 0.12,
                     "Specular IOR Level": 0.6})
    nb.l(col, p.inputs["Base Color"])
    rough = nb.n("ShaderNodeMapRange", **{"To Min": 0.55, "To Max": 0.22})
    nb.l(pits.outputs[0], rough.inputs["Value"])
    nb.l(rough.outputs[0], p.inputs["Roughness"])
    nb.l(_bump(nb, height, punct_strength, 0.015), p.inputs["Normal"])
    nb.output(p.outputs[0])
    return mat


def eye_material(name="Eye"):
    mat = bpy.data.materials.new(name)
    nb = NB(mat)
    co = _coords(nb)
    vor = nb.n("ShaderNodeTexVoronoi", Scale=140.0, _feature='DISTANCE_TO_EDGE')
    nb.l(co, vor.inputs["Vector"])
    p = _bsdf(nb, **{"Base Color": (0.01, 0.008, 0.006, 1), "Roughness": 0.12,
                     "Coat Weight": 1.0, "Coat Roughness": 0.02})
    nb.l(_bump(nb, vor.outputs["Distance"], 0.6, 0.01), p.inputs["Normal"])
    nb.output(p.outputs[0])
    return mat


def soft_body_material(name, color=(0.93, 0.87, 0.70, 1), sss=(1.0, 0.75, 0.5), gloss=0.28,
                       darken_value=None, dark=(0.42, 0.2, 0.09, 1)):
    """Larva / pupa / egg: waxy, wet cuticle with strong subsurface scattering."""
    mat = bpy.data.materials.new(name)
    nb = NB(mat)
    co = _coords(nb)
    n1 = nb.n("ShaderNodeTexNoise", Scale=14.0, Detail=6.0)
    nb.l(co, n1.inputs["Vector"])
    wr = nb.n("ShaderNodeTexWave", _wave_type='BANDS', _bands_direction='X', Scale=3.0,
              Distortion=4.0, Detail=6.0)
    nb.l(co, wr.inputs["Vector"])
    col = nb.mix_rgb(n1.outputs["Fac"], color,
                     (color[0] * 0.9, color[1] * 0.85, color[2] * 0.75, 1))
    if darken_value:
        val = nb.n("ShaderNodeValue", _name=darken_value, _label=darken_value)
        val.outputs[0].default_value = 0.0
        col = nb.mix_rgb(val.outputs[0], col, dark)
    p = _bsdf(nb, **{"Roughness": gloss, "Subsurface Weight": 1.0, "Subsurface Scale": 0.18,
                     "Subsurface Radius": sss, "Coat Weight": 0.5, "Coat Roughness": 0.1,
                     "Sheen Weight": 0.15})
    nb.l(col, p.inputs["Base Color"])
    h = nb.math('ADD', n1.outputs["Fac"], nb.math('MULTIPLY', wr.outputs["Fac"], None, vb=0.3))
    nb.l(_bump(nb, h, 0.12, 0.01), p.inputs["Normal"])
    nb.output(p.outputs[0])
    return mat


def gel_material(name="EggPlug"):
    """Gelatinous secretion that seals the oviposition hole."""
    mat = bpy.data.materials.new(name)
    nb = NB(mat)
    p = _bsdf(nb, **{"Base Color": (0.95, 0.82, 0.55, 1), "Roughness": 0.08,
                     "Transmission Weight": 0.85, "IOR": 1.38, "Subsurface Weight": 0.2,
                     "Coat Weight": 1.0, "Coat Roughness": 0.03})
    nb.output(p.outputs[0])
    return mat


def emission_material(name, color=(0.4, 0.85, 1.0, 1), strength=4.0):
    mat = bpy.data.materials.new(name)
    nb = NB(mat)
    e = nb.n("ShaderNodeEmission", Color=color, Strength=strength)
    nb.output(e.outputs[0])
    return mat


def dissolve(mat, value_name, scale=9.0, invert=False):
    """Wrap an existing material's surface in a noise-threshold dissolve driven by a Value node."""
    nt = mat.node_tree
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    src = out.inputs["Surface"].links[0].from_socket
    co = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = scale
    nz.inputs["Detail"].default_value = 4.0
    nt.links.new(co.outputs["Object"], nz.inputs["Vector"])
    val = nt.nodes.new("ShaderNodeValue")
    val.name = val.label = value_name
    val.outputs[0].default_value = 0.0 if not invert else 1.0
    # remap value so 0 -> fully hidden, 1 -> fully shown
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = -0.05
    mr.inputs["To Max"].default_value = 1.05
    nt.links.new(val.outputs[0], mr.inputs["Value"])
    cmp_ = nt.nodes.new("ShaderNodeMath")
    cmp_.operation = 'LESS_THAN'
    nt.links.new(nz.outputs["Fac"], cmp_.inputs[0])
    sub = nt.nodes.new("ShaderNodeMath")
    sub.operation = 'MULTIPLY_ADD'  # spread noise around 0.5 -> covers 0..1
    sub.inputs[1].default_value = 1.0
    sub.inputs[2].default_value = 0.0
    nt.links.new(mr.outputs[0], cmp_.inputs[1])
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    if invert:
        nt.links.new(cmp_.outputs[0], mix.inputs[0])
        nt.links.new(src, mix.inputs[1])
        nt.links.new(tr.outputs[0], mix.inputs[2])
    else:
        nt.links.new(cmp_.outputs[0], mix.inputs[0])
        nt.links.new(tr.outputs[0], mix.inputs[1])
        nt.links.new(src, mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return val


def set_value_node(mat, name, value, frame=None):
    node = mat.node_tree.nodes[name]
    node.outputs[0].default_value = value
    if frame is not None:
        node.outputs[0].keyframe_insert("default_value", frame=frame)


def assign(obj, mat):
    if obj.data is None:
        return
    obj.data.materials.clear()
    obj.data.materials.append(mat)
