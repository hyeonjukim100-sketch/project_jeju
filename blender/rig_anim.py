import bpy, math, os, sys, json, struct
import numpy as np
from mathutils import Vector, Matrix

OUT = os.path.dirname(os.path.abspath(__file__)) + "/out"
bpy.ops.wm.open_mainfile(filepath=OUT + "/haenyeo_static.blend")
body = bpy.data.objects['Haenyeo']

# ---------- skeleton ----------
SIDES = {'R': -1, 'L': 1}
BONES = [('root', None, (0, 0, 0), (0, 0, .1)),
         ('spine', 'root', (0, 0, .25), (0, 0, .58)),
         ('head', 'spine', (0, 0, .58), (0, 0, .99))]
for side, s in SIDES.items():
    BONES += [
        ('arm_upper.' + side, 'spine', (s * .165, 0, .485), (s * .262, 0, .398)),
        ('arm_fore.' + side, 'arm_upper.' + side, (s * .262, 0, .398), (s * .328, 0, .332)),
        ('hand.' + side, 'arm_fore.' + side, (s * .328, 0, .332), (s * .372, 0, .294)),
        ('fingers.' + side, 'hand.' + side, (s * .372, 0, .294), (s * .425, 0, .248)),        ('leg_upper.' + side, 'root', (s * .075, 0, .23), (s * .075, 0, .115)),
        ('leg_lower.' + side, 'leg_upper.' + side, (s * .075, 0, .115), (s * .075, 0, .04)),
        ('foot.' + side, 'leg_lower.' + side, (s * .075, 0, .04), (s * .075, -.1, .04)),
    ]
ORDER = [b[0] for b in BONES]
PAR = {b[0]: b[1] for b in BONES}

bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
rig = bpy.context.active_object
rig.name = 'Rig'
rig.data.name = 'Rig'
eb = rig.data.edit_bones
for b in list(eb):
    eb.remove(b)
for name, parent, h, t in BONES:
    b = eb.new(name)
    b.head = h
    b.tail = t
    if parent:
        b.parent = eb[parent]
        b.use_connect = (Vector(h) - eb[parent].tail).length < 1e-6
bpy.ops.object.mode_set(mode='OBJECT')

body.parent = rig
mod = body.modifiers.new('Armature', 'ARMATURE')
mod.object = rig

M = {n: rig.data.bones[n].matrix_local.to_3x3() for n in ORDER}
D0 = {n: (M[n] @ Vector((0, 1, 0))).normalized() for n in ORDER}
I3 = Matrix.Identity(3)

def rotx(d): return Matrix.Rotation(math.radians(d), 3, 'X')
def roty(d): return Matrix.Rotation(math.radians(d), 3, 'Y')
def rotz(d): return Matrix.Rotation(math.radians(d), 3, 'Z')

def build_rel(dirs=None, extra=None):
    """dirs: bone -> world direction the bone should point at.
    extra: bone -> world-axis rotation relative to its parent."""
    dirs = dirs or {}
    extra = extra or {}
    rel, tot = {}, {}
    for n in ORDER:
        p = PAR[n]
        Dp = tot[p] if p else I3
        if n in dirs:
            Dt = D0[n].rotation_difference(Vector(dirs[n]).normalized()).to_matrix()
            R = Dp.inverted() @ Dt
        else:
            R = extra.get(n, I3)
        rel[n] = R
        tot[n] = Dp @ R
    return rel

def key(frame, rel, loc=None, scl=None):
    scl = scl or {}
    for n in ORDER:
        pb = rig.pose.bones[n]
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = (M[n].inverted() @ rel.get(n, I3) @ M[n]).to_quaternion()
        pb.keyframe_insert('rotation_quaternion', frame=frame)
    root = rig.pose.bones['root']
    root.location = M['root'].inverted() @ (loc or Vector())
    root.keyframe_insert('location', frame=frame)
    for n in ('spine', 'hand.R', 'hand.L'):
        k = scl.get(n, 1.0)
        pb = rig.pose.bones[n]
        pb.scale = (k, k, k)
        pb.keyframe_insert('scale', frame=frame)

ACTS = {}
LEN = {}
def new_action(name, length):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = act
    ACTS[name] = act
    LEN[name] = length
    return act

def breathe(t):
    return 1.0 + 0.016 * (0.5 - 0.5 * math.cos(2 * math.pi * t))

def ik2(S, W, a, b, hint):
    d = W - S
    L = min(d.length, a + b - 1e-4)
    dn = d.normalized()
    x = (L * L + a * a - b * b) / (2 * L)
    h = math.sqrt(max(a * a - x * x, 0))
    perp = (hint - dn * hint.dot(dn)).normalized()
    return S + dn * x + perp * h

# ---------- idle ----------
new_action('idle', 72)
for f in range(0, 73, 6):
    t = f / 72
    w = 2 * math.pi * t
    rel = build_rel(extra={
        'head': rotx(2.2 * math.sin(w - 0.6)) @ rotz(2.5 * math.sin(w + 0.8)) @ roty(1.5 * math.sin(w - 0.3)),
        'spine': roty(1.2 * math.sin(w)),
        'arm_upper.R': roty(2.2 * math.sin(w - 0.9)),
        'arm_upper.L': roty(-2.2 * math.sin(w - 0.9)),
        'arm_fore.R': rotx(-2 * math.sin(w - 1.4)),
        'arm_fore.L': rotx(-2 * math.sin(w - 1.4)),
    })
    key(f, rel, loc=Vector((0.004 * math.sin(w), 0, 0)), scl={'spine': breathe(t)})

# ---------- wave (character's right hand) ----------
# one greeting: anticipation -> raise with overshoot -> three waves -> lower and settle.
# starts and ends at the rest pose, so it also loops as a periodic greeting.
def ease(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)

def ease_out_back(x, k=1.9):
    x = max(0.0, min(1.0, x))
    return 1 + (k + 1) * (x - 1) ** 3 + k * (x - 1) ** 2

def raise_env(f):
    if f < 6:
        return -0.1 * ease(f / 6)
    if f < 22:
        return -0.1 + 1.1 * ease_out_back((f - 6) / 16) * 1.0 + 0.1 * ease((f - 6) / 16) * 0.0
    if f < 62:
        return 1.0
    if f < 80:
        return 1.0 - ease((f - 62) / 18) * 1.04
    return -0.04 * (1 - ease((f - 80) / 4))

def wave_env(f):
    return ease((f - 20) / 8) * (1 - ease((f - 56) / 10))

def mix(a, b, w):
    return (a * (1 - w) + b * w).normalized()

def wdir(deg):
    r = math.radians(deg)
    return Vector((-math.sin(r), -0.05, math.cos(r)))

WAVE_LEN = 84
new_action('wave', WAVE_LEN)
up_dir = Vector((-.75, -.18, .62)).normalized()
for f in range(0, WAVE_LEN + 1, 2):
    A = raise_env(f)
    A_f = raise_env(f - 2)
    A_h = raise_env(f - 4)
    W = wave_env(f)
    a = 2 * math.pi * (f - 22) / 14
    dirs = {
        'arm_upper.R': mix(D0['arm_upper.R'], up_dir, A) if A > -0.5 else D0['arm_upper.R'],
        'arm_fore.R': mix(D0['arm_fore.R'], wdir(22 + 30 * W * math.sin(a)), A_f),
        'hand.R': mix(D0['hand.R'], wdir(22 + 38 * W * math.sin(a - 0.9)), A_h),
        'fingers.R': mix(D0['fingers.R'], wdir(22 + 14 * W * math.sin(a - 1.7)), A_h),
    }
    extra = {
        'head': roty(-5 * A + 1.5 * W * math.sin(a - 0.4)) @ rotz(-3 * A) @ rotx(1.8 * W * (0.5 - 0.5 * math.cos(2 * a)) - 2 * max(0.0, -A) * 10),
        'spine': roty(2 * A + 1.2 * W * math.sin(a - 0.5)) @ rotz(-3 * A),
        'arm_upper.L': roty(-5 * A - 1.5 * W * math.sin(a - 0.8)),
        'arm_fore.L': rotx(-3 * A),
    }
    rel = build_rel(dirs, extra)
    loc = Vector((0.006 * A, 0, -0.006 * A - 0.003 * W * (0.5 - 0.5 * math.cos(2 * a))))
    key(f, rel, loc=loc, scl={'spine': breathe(f / WAVE_LEN)})

# ---------- walk in place ----------
new_action('walk', 32)
A, K, B = 28, 38, 22
for f in range(0, 33, 2):
    phi = 2 * math.pi * f / 32
    extra = {}
    for side, off in (('R', 0.0), ('L', math.pi)):
        p = phi + off
        th = -A * math.sin(p)
        kn = K * max(0.0, math.cos(p))
        extra['leg_upper.' + side] = rotx(th)
        extra['leg_lower.' + side] = rotx(kn)
        extra['foot.' + side] = rotx(-(th + kn) * 0.85)
        extra['arm_upper.' + side] = rotx(B * math.sin(p))
        extra['arm_fore.' + side] = rotx(-12 - 6 * max(0.0, -math.sin(p)))
        extra['hand.' + side] = rotx(-8 * math.sin(p - 0.9))
    extra['spine'] = rotz(6 * math.sin(phi)) @ rotx(3) @ roty(2.5 * math.sin(phi))
    extra['head'] = rotz(-4 * math.sin(phi - 0.3)) @ rotx(-3 + 1.5 * math.cos(2 * phi - 0.5)) @ roty(-2 * math.sin(phi))
    rel = build_rel(extra=extra)
    key(f, rel, loc=Vector((0.008 * math.sin(phi), 0, 0.014 * math.cos(2 * phi))), scl={'spine': 1.0})

# ---------- preview renders ----------
def hexlin(h):
    h = h.lstrip('#')
    r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), 1)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 480
scene.render.resolution_y = 620
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

VIEWS = {'front': ((0, -5, 0.52), (90, 0, 0)), 'side': ((-5, 0, 0.52), (90, 0, -90))}

def shot(action, frame, view, name, zoom=1.25, cz=0.52):
    cam_data.ortho_scale = zoom
    ad = rig.animation_data
    ad.action = ACTS[action]
    try:
        ad.action_slot = ACTS[action].slots[0]
    except Exception:
        pass
    scene.frame_set(frame)
    loc, rot = VIEWS[view]
    cam.location = (loc[0], loc[1], cz)
    cam.rotation_euler = [math.radians(a) for a in rot]
    scene.render.filepath = OUT + "/pv_%s.png" % name
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(scene.render.filepath)
    a = np.empty(im.size[0] * im.size[1] * 4, dtype=np.float32)
    im.pixels.foreach_get(a)
    return a.reshape(im.size[1], im.size[0], 4)

shots = [shot('wave', 4, 'front', 'wave4'),
         shot('wave', 14, 'front', 'wave14'),
         shot('wave', 28, 'front', 'wave28'),
         shot('wave', 35, 'front', 'wave35'),
         shot('wave', 72, 'front', 'wave72'),
         shot('walk', 8, 'side', 'walk_a')]
sheet = np.concatenate(shots, axis=1)
img = bpy.data.images.new('sheet', sheet.shape[1], sheet.shape[0])
img.pixels.foreach_set(sheet.ravel())
img.filepath_raw = OUT + "/anim_sheet.png"
img.file_format = 'PNG'
img.save()

# ---------- NLA + export ----------
ad = rig.animation_data
ad.action = None
for name, act in ACTS.items():
    tr = ad.nla_tracks.new()
    tr.name = name
    st = tr.strips.new(name, 0, act)
    try:
        st.action_slot = act.slots[0]
    except Exception:
        pass

bpy.ops.object.select_all(action='DESELECT')
scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=OUT + "/haenyeo_rigged.blend")
bpy.ops.export_scene.gltf(filepath=OUT + "/haenyeo.glb", export_format='GLB',
                          export_animations=True, export_animation_mode='NLA_TRACKS',
                          export_skins=True, export_yup=True)

with open(OUT + "/haenyeo.glb", 'rb') as fh:
    fh.read(12)
    clen, _ = struct.unpack('<II', fh.read(8))
    j = json.loads(fh.read(clen))
print("GLB size KB:", os.path.getsize(OUT + "/haenyeo.glb") // 1024)
print("ANIMS:", [(a['name'], len(a['channels'])) for a in j.get('animations', [])])
print("JOINTS:", len(j['skins'][0]['joints']), "MATERIALS:", len(j['materials']),
      "ALPHA:", [m.get('alphaMode') for m in j['materials'] if m.get('alphaMode')])

# ---------- face-only model ----------
import bmesh
bpy.ops.object.select_all(action='DESELECT')
face = body.copy()
face.data = body.data.copy()
face.name = 'HaenyeoFace'
bpy.context.collection.objects.link(face)
face.parent = None
face.data.transform(body.matrix_world)
face.matrix_world = Matrix.Identity(4)
for m in list(face.modifiers):
    face.modifiers.remove(m)
head_idx = face.vertex_groups['head'].index
bm = bmesh.new()
bm.from_mesh(face.data)
dl = bm.verts.layers.deform.verify()
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v[dl].get(head_idx, 0.0) < 0.5], context='VERTS')
for v in bm.verts:
    v.co.z -= 0.78
bm.to_mesh(face.data)
bm.free()
face.vertex_groups.clear()
bpy.context.view_layer.objects.active = face
face.select_set(True)
bpy.ops.object.material_slot_remove_unused()

# preview: hide the body, render the face alone
body.hide_render = True
rig.hide_render = True
cam_data.ortho_scale = 0.62
fshots = []
for view, name in (('front', 'face_front'), ('side', 'face_side')):
    loc, rot = VIEWS[view]
    cam.location = (loc[0], loc[1], 0.02)
    cam.rotation_euler = [math.radians(a) for a in rot]
    scene.render.filepath = OUT + "/pv_%s.png" % name
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(scene.render.filepath)
    a = np.empty(im.size[0] * im.size[1] * 4, dtype=np.float32)
    im.pixels.foreach_get(a)
    fshots.append(a.reshape(im.size[1], im.size[0], 4))
fsheet = np.concatenate(fshots, axis=1)
fimg = bpy.data.images.new('fsheet', fsheet.shape[1], fsheet.shape[0])
fimg.pixels.foreach_set(fsheet.ravel())
fimg.filepath_raw = OUT + "/face_sheet.png"
fimg.file_format = 'PNG'
fimg.save()

bpy.ops.object.select_all(action='DESELECT')
face.select_set(True)
bpy.context.view_layer.objects.active = face
bpy.ops.export_scene.gltf(filepath=OUT + "/haenyeo_face.glb", export_format='GLB',
                          use_selection=True, export_animations=False, export_skins=False, export_yup=True)
print("FACE size KB:", os.path.getsize(OUT + "/haenyeo_face.glb") // 1024,
      "tris:", sum(len(p.vertices) - 2 for p in face.data.polygons))
print("DONE")
