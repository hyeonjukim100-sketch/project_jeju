import bpy, bmesh, math, os, sys
from mathutils import Vector

OUT = os.path.dirname(os.path.abspath(__file__)) + "/out"
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)

# ---------- helpers ----------
def hexlin(h):
    h = h.lstrip('#')
    r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), 1)

MATS = {}
def mat(name, hexc, rough=0.6):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hexlin(hexc)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Specular IOR Level'].default_value = 0.25
    MATS[name] = m
    return m

SKIN = mat('skin', '#5f5855', 0.7)
SUIT = mat('suit', '#3a3c45', 0.65)
SCARF = mat('scarf', '#f4f1ea', 0.75)
BAND = mat('band', '#f0a24c', 0.6)
RED = mat('goggle_red', '#b4414d', 0.5)
GLASS = mat('glass', '#e3edf1', 0.25)
TEWAK = mat('tewak', '#f0641e', 0.5)
NET = mat('net', '#cfa56a', 0.8)
WHITE = mat('eye_white', '#f7f4ee', 0.4)
PUPIL = mat('pupil', '#241c1c', 0.3)
BLUSH = mat('blush', '#d9686a', 0.8)
BROW = mat('brow', '#3d2e2c', 0.7)

PARTS = []

def activate(ob):
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)

def finish(ob, bone, material):
    ob.data.materials.append(material)
    activate(ob)
    bpy.ops.object.shade_smooth()
    vg = ob.vertex_groups.new(name=bone)
    vg.add(list(range(len(ob.data.vertices))), 1.0, 'REPLACE')
    PARTS.append(ob)
    return ob

def sphere(name, loc, radii, rot=None, seg=40, rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = radii
    if rot:
        ob.rotation_euler = [math.radians(a) for a in rot]
    return ob

def rod(name, p1, p2, r, extra=0.0, flat=1.0):
    p1, p2 = Vector(p1), Vector(p2)
    d = p2 - p1
    ob = sphere(name, (p1 + p2) / 2, (r, r * flat, d.length / 2 + extra))
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    return ob

def torus(name, loc, major, minor, axis=(0, 0, 1), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
                                     major_segments=64, minor_segments=16, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = scale
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(Vector(axis))
    return ob

def tube(name, pts, radius):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for p, co in zip(sp.points, pts):
        p.co = (co[0], co[1], co[2], 1)
    cu.bevel_depth = radius
    cu.bevel_resolution = 4
    cu.use_fill_caps = True
    ob = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(ob)
    activate(ob)
    bpy.ops.object.convert(target='MESH')
    return bpy.context.view_layer.objects.active

def boolean_diff(a, b):
    m = a.modifiers.new('cut', 'BOOLEAN')
    m.operation = 'DIFFERENCE'
    m.object = b
    m.solver = 'EXACT'
    activate(a)
    bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(b)

def smoothstep(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)

def skinned_tube(name, pts, radii, bones, material, flat=1.0, blend=0.03, rings=26, per=24, cap=6):
    """One smooth tube along a 3-point path in the XZ plane, weighted across two bones."""
    P = [Vector(p) for p in pts]
    seg = [(P[1] - P[0]).length, (P[2] - P[1]).length]
    L = sum(seg)
    sj = seg[0]
    t1 = (P[1] - P[0]).normalized()
    t2 = (P[2] - P[1]).normalized()

    def at(s):
        s = max(0.0, min(L, s))
        i, u = (0, s / seg[0]) if s <= sj else (1, (s - sj) / seg[1])
        pos = P[i].lerp(P[i + 1], u)
        r = radii[i] + (radii[i + 1] - radii[i]) * u
        w = smoothstep((s - sj + blend) / (2 * blend))
        return pos, t1.lerp(t2, w).normalized(), r, w

    bm = bmesh.new()
    info = []
    Y = Vector((0, 1, 0))

    def ring(center, t, r, w):
        u = Vector((t.z, 0, -t.x))
        vs = []
        for k in range(per):
            a = 2 * math.pi * k / per
            v = bm.verts.new(center + u * (r * math.cos(a)) + Y * (r * flat * math.sin(a)))
            info.append((v, w))
            vs.append(v)
        return vs

    def apex(co, w):
        v = bm.verts.new(co)
        info.append((v, w))
        return v

    seq = []
    p0, tt0, r0, _ = at(0)
    seq.append(apex(p0 - tt0 * r0, 0.0))
    for k in range(1, cap):
        a = (math.pi / 2) * (cap - k) / cap
        seq.append(ring(p0 - tt0 * (r0 * math.sin(a)), tt0, r0 * math.cos(a), 0.0))
    for i in range(rings + 1):
        p, tt, r, w = at(L * i / rings)
        seq.append(ring(p, tt, r, w))
    p1, tt1, r1, _ = at(L)
    for k in range(1, cap):
        a = (math.pi / 2) * k / cap
        seq.append(ring(p1 + tt1 * (r1 * math.sin(a)), tt1, r1 * math.cos(a), 1.0))
    seq.append(apex(p1 + tt1 * r1, 1.0))

    for a, b in zip(seq, seq[1:]):
        if isinstance(a, list) and isinstance(b, list):
            for k in range(per):
                bm.faces.new((a[k], a[(k + 1) % per], b[(k + 1) % per], b[k]))
        elif isinstance(a, list):
            for k in range(per):
                bm.faces.new((a[k], a[(k + 1) % per], b))
        else:
            for k in range(per):
                bm.faces.new((a, b[(k + 1) % per], b[k]))
    bm.verts.index_update()
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material)
    activate(ob)
    bpy.ops.object.shade_smooth()
    g0 = ob.vertex_groups.new(name=bones[0])
    g1 = ob.vertex_groups.new(name=bones[1])
    for v, w in info:
        if w < 0.999:
            g0.add([v.index], 1 - w, 'REPLACE')
        if w > 0.001:
            g1.add([v.index], w, 'REPLACE')
    bm.free()
    PARTS.append(ob)
    return ob

# ---------- head ----------
C = Vector((0, 0, 0.78))

def skin_y(x, z):
    dz = z - C.z
    v = 1 - (x / 0.215) ** 2 - (dz / 0.21) ** 2
    return C.y - 0.2 * math.sqrt(max(v, 0.01))

finish(sphere('head_skin', C, (0.215, 0.2, 0.21), seg=48, rings=24), 'head', SKIN)

scarf = sphere('scarf', C + Vector((0, 0.01, 0.005)), (0.235, 0.225, 0.235), seg=48, rings=24)
cutter = sphere('cutter', C + Vector((0, -0.15, -0.07)), (0.197, 0.15, 0.14), seg=48, rings=24)
boolean_diff(scarf, cutter)
finish(scarf, 'head', SCARF)

# headband, higher at the front
finish(torus('band', C + Vector((0, 0.005, 0.005)), 0.232, 0.025,
             axis=(0, math.sin(math.radians(18)), math.cos(math.radians(18))), scale=(1, 0.96, 1)),
       'head', BAND)

# goggles on the forehead, facing forward and up
gax = (0, -math.cos(math.radians(50)), math.sin(math.radians(50)))
gc = C + Vector((0, -0.155, 0.175)) + Vector(gax) * 0.012
finish(torus('goggle_red', gc, 0.082, 0.018, axis=gax), 'head', RED)
finish(torus('goggle_orange', gc + Vector(gax) * 0.004, 0.066, 0.01, axis=gax), 'head', BAND)
glass = sphere('glass', gc + Vector(gax) * 0.006, (0.07, 0.07, 0.014))
glass.rotation_mode = 'QUATERNION'
glass.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(Vector(gax))
finish(glass, 'head', GLASS)

# back knot
finish(sphere('knot', C + Vector((0, 0.235, -0.065)), (0.03, 0.026, 0.026)), 'head', SCARF)
for s in (-1, 1):
    finish(sphere('tail%d' % s, C + Vector((s * 0.04, 0.23, -0.105)), (0.04, 0.01, 0.03),
                  rot=(0, s * 30, s * 10)), 'head', SCARF)

# face
for s in (-1, 1):
    x = s * 0.085
    z = C.z - 0.045
    y = skin_y(x, z)
    finish(sphere('eye%d' % s, (x, y + 0.002, z), (0.036, 0.016, 0.038)), 'head', WHITE)
    finish(sphere('pupil%d' % s, (x, y - 0.008, z - 0.002), (0.026, 0.012, 0.028)), 'head', PUPIL)
    finish(sphere('shine%d' % s, (x + 0.008, y - 0.017, z + 0.011), (0.007, 0.004, 0.007), seg=16, rings=8), 'head', WHITE)
    bz = C.z + 0.012
    brow_pts = []
    for i in range(9):
        t = i / 8 - 0.5
        bx = x + t * 0.07
        brow_pts.append((bx, skin_y(bx, bz) - 0.004, bz + 0.012 * (1 - (t * 2) ** 2) + s * t * 0.012))
    finish(tube('brow%d' % s, brow_pts, 0.0055), 'head', BROW)
    bx = s * 0.125
    bzz = C.z - 0.085
    finish(sphere('blush%d' % s, (bx, skin_y(bx, bzz) + 0.004, bzz), (0.034, 0.008, 0.024),
                  rot=(0, 0, s * 28)), 'head', BLUSH)

mz = C.z - 0.105
smile = []
for i in range(13):
    t = i / 12 * 2 - 1
    mx = t * 0.04
    smile.append((mx, skin_y(mx, mz) - 0.003, mz + 0.016 * t * t))
finish(tube('smile', smile, 0.005), 'head', BROW)
finish(sphere('nose', (0, skin_y(0, C.z - 0.07) - 0.002, C.z - 0.07), (0.016, 0.014, 0.013)), 'head', SKIN)

# ---------- torso ----------
finish(sphere('torso', (0, 0, 0.405), (0.185, 0.14, 0.215), seg=48, rings=24), 'spine', SUIT)

# ---------- arms ----------
SH = {'R': -1, 'L': 1}
for side, s in SH.items():
    skinned_tube('arm' + side, [(s * 0.165, 0, 0.485), (s * 0.262, 0, 0.398), (s * 0.328, 0, 0.332)],
                 [0.054, 0.052, 0.05], ['arm_upper.' + side, 'arm_fore.' + side], SUIT, blend=0.035)
    skinned_tube('hand' + side, [(s * 0.322, 0, 0.338), (s * 0.372, 0, 0.294), (s * 0.425, 0, 0.248)],
                 [0.047, 0.045, 0.04], ['hand.' + side, 'fingers.' + side], SKIN, flat=0.8, blend=0.04)
# ---------- legs ----------
for side, s in SH.items():
    x = s * 0.075
    skinned_tube('leg' + side, [(x, 0, 0.235), (x, 0, 0.115), (x, 0, 0.04)],
                 [0.068, 0.068, 0.065], ['leg_upper.' + side, 'leg_lower.' + side], SUIT, blend=0.03)
    finish(sphere('foot' + side, (x, -0.035, 0.045), (0.072, 0.105, 0.048)), 'foot.' + side, SUIT)

# ---------- tewak float + net ----------
ring_c = Vector((-0.11, 0.17, 0.35))
ring_axis = Vector((-0.7, 0.7, 0.1)).normalized()
finish(torus('tewak', ring_c, 0.135, 0.056, axis=ring_axis), 'spine', TEWAK)

bm = bmesh.new()
bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().z > 0.3], context='FACES')
me = bpy.data.meshes.new('net')
bm.to_mesh(me)
bm.free()
net = bpy.data.objects.new('net', me)
bpy.context.collection.objects.link(net)
net.scale = (0.11, 0.06, 0.2)
net.location = ring_c + Vector((-0.03, 0.02, -0.15))
net.rotation_euler = (0, math.radians(-12), math.radians(-35))
activate(net)
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
w = net.modifiers.new('wire', 'WIREFRAME')
w.thickness = 0.006
w.use_replace = True
bpy.ops.object.modifier_apply(modifier=w.name)
finish(net, 'spine', NET)

finish(tube('strap', [(0.09, 0.02, 0.6), (0.04, 0.1, 0.55), (-0.03, 0.17, 0.5), (-0.1, 0.2, 0.45)], 0.007), 'spine', NET)

# ---------- join ----------
bpy.ops.object.select_all(action='DESELECT')
for o in PARTS:
    o.select_set(True)
bpy.context.view_layer.objects.active = PARTS[0]
bpy.ops.object.join()
body = bpy.context.active_object
body.name = 'Haenyeo'
bpy.ops.wm.save_as_mainfile(filepath=OUT + "/haenyeo_static.blend")

# ---------- render ----------
if '--no-render' in sys.argv:
    sys.exit(0)

import numpy as np
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.render.resolution_x = 700
scene.render.resolution_y = 900
scene.view_settings.view_transform = 'Standard'

world = bpy.data.worlds.new('w')
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs['Color'].default_value = hexlin('#aed6ea')
bg.inputs['Strength'].default_value = 0.7

cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 1.25
cam = bpy.data.objects.new('cam', cam_data)
bpy.context.collection.objects.link(cam)
scene.camera = cam

sun_d = bpy.data.lights.new('sun', 'SUN')
sun_d.energy = 3.5
sun_d.angle = math.radians(25)
sun = bpy.data.objects.new('sun', sun_d)
bpy.context.collection.objects.link(sun)
sun.parent = cam
sun.rotation_euler = (math.radians(35), math.radians(-25), 0)

views = {
    'front': ((0, -5, 0.52), (90, 0, 0)),
    'side': ((-5, 0, 0.52), (90, 0, -90)),
    'back': ((0, 5, 0.52), (90, 0, 180)),
}
imgs = []
for name, (loc, rot) in views.items():
    cam.location = loc
    cam.rotation_euler = [math.radians(a) for a in rot]
    scene.render.filepath = OUT + "/%s.png" % name
    bpy.ops.render.render(write_still=True)
    imgs.append(scene.render.filepath)

arrs = []
for p in imgs:
    im = bpy.data.images.load(p)
    a = np.empty(im.size[0] * im.size[1] * 4, dtype=np.float32)
    im.pixels.foreach_get(a)
    arrs.append(a.reshape(im.size[1], im.size[0], 4))
sheet = np.concatenate(arrs, axis=1)
out = bpy.data.images.new('sheet', sheet.shape[1], sheet.shape[0])
out.pixels.foreach_set(sheet.ravel())
out.filepath_raw = OUT + "/sheet.png"
out.file_format = 'PNG'
out.save()
print("DONE", OUT)
