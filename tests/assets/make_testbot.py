"""Make a small rigged test body as .glb files, named and boned like a Mixamo character (mixamorig:Hips and so on),
one file per move, the way Mixamo hands them out: idle.glb (the body), walk, run, jump, slash, roll, death.
It only proves the path from a .glb to the game; it is not art.  Run: python tests/assets/make_testbot.py"""
import json, math, struct, pathlib
import numpy as np
OUT = pathlib.Path(__file__).parent / 'testbot'; OUT.mkdir(exist_ok=True)
# bones: name, parent, world position in the rest pose (metres, Y up, facing +Z)
B = [('Hips', None, (0, 1.0, 0)), ('Spine', 'Hips', (0, 1.2, 0)), ('Spine2', 'Spine', (0, 1.42, 0)), ('Neck', 'Spine2', (0, 1.55, 0)), ('Head', 'Neck', (0, 1.62, 0)), ('HeadTop_End', 'Head', (0, 1.84, 0))]
for side, sx in (('Left', 1), ('Right', -1)):
    B += [(f'{side}Arm', 'Spine2', (0.2 * sx, 1.48, 0)), (f'{side}ForeArm', f'{side}Arm', (0.2 * sx, 1.2, 0)), (f'{side}Hand', f'{side}ForeArm', (0.2 * sx, 0.95, 0)), (f'{side}HandEnd', f'{side}Hand', (0.2 * sx, 0.85, 0)),
          (f'{side}UpLeg', 'Hips', (0.1 * sx, 0.95, 0)), (f'{side}Leg', f'{side}UpLeg', (0.1 * sx, 0.52, 0)), (f'{side}Foot', f'{side}Leg', (0.1 * sx, 0.08, 0)), (f'{side}ToeBase', f'{side}Foot', (0.1 * sx, 0.02, 0.12))]
idx = {n: i for i, (n, _, _) in enumerate(B)}
pos = {n: np.array(p, float) for n, _, p in B}
def box(a, b, w, d, bone):   # a box from point a to b, all weighted to one bone
    a, b = np.array(a, float), np.array(b, float); c = (a + b) / 2; h = np.linalg.norm(b - a) / 2 + 0.02
    up = (b - a) / (np.linalg.norm(b - a) + 1e-9); x = np.cross(up, [0, 0, 1]); x = x / (np.linalg.norm(x) + 1e-9) if np.linalg.norm(x) > 1e-6 else np.array([1., 0, 0]); z = np.cross(x, up)
    V, N, I = [], [], []
    for axis, sgn in ((x, 1), (x, -1), (up, 1), (up, -1), (z, 1), (z, -1)):
        o = [v for v in (x, up, z) if v is not axis]; ext = {id(x): w, id(up): h, id(z): d}
        cen = c + axis * sgn * ext[id(axis)]; u, v = o[0] * ext[id(o[0])], o[1] * ext[id(o[1])]
        base = len(V); quad = [cen - u - v, cen + u - v, cen + u + v, cen - u + v]
        if sgn < 0: quad = quad[::-1]
        V += quad; N += [axis * sgn] * 4; I += [base, base + 1, base + 2, base, base + 2, base + 3]
    return V, N, I, idx[bone]
parts = {'cloth': [], 'skin': []}
parts['cloth'] += [box(pos['Hips'] - [0, 0.05, 0], pos['Spine2'], 0.16, 0.1, 'Spine'), box(pos['Spine2'], pos['Neck'], 0.18, 0.11, 'Spine2')]
parts['skin'] += [box(pos['Head'], pos['HeadTop_End'], 0.1, 0.11, 'Head')]
for s in ('Left', 'Right'):
    parts['cloth'] += [box(pos[f'{s}Arm'], pos[f'{s}ForeArm'], 0.045, 0.045, f'{s}Arm'), box(pos[f'{s}ForeArm'], pos[f'{s}Hand'], 0.04, 0.04, f'{s}ForeArm'),
                       box(pos[f'{s}UpLeg'], pos[f'{s}Leg'], 0.06, 0.06, f'{s}UpLeg'), box(pos[f'{s}Leg'], pos[f'{s}Foot'], 0.05, 0.05, f'{s}Leg'), box(pos[f'{s}Foot'], pos[f'{s}ToeBase'], 0.045, 0.05, f'{s}Foot')]
    parts['skin'] += [box(pos[f'{s}Hand'], pos[f'{s}HandEnd'], 0.035, 0.03, f'{s}Hand')]
def q(ax, th): s = math.sin(th / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, math.cos(th / 2)]
X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)
T = lambda n, d: np.linspace(0, d, n)
def anim(name):   # tracks: {bone: {'rot': [(t, quat)], 'pos': [(t, xyz)]}}
    tr = {}
    def rot(b, keys): tr.setdefault(b, {})['rot'] = keys
    def mov(b, keys): tr.setdefault(b, {})['pos'] = keys
    if name == 'idle':
        ts = T(9, 2.0); rot('Spine', [(t, q(X, 0.04 * math.sin(t * math.pi))) for t in ts]); mov('Hips', [(t, (0, 1.0 + 0.01 * math.sin(t * math.pi), 0)) for t in ts])
    elif name in ('walk', 'run'):
        A, K, d = (0.5, 0.6, 1.0) if name == 'walk' else (0.85, 1.3, 0.66); ts = T(17, d)
        for s, ph in (('Left', 0), ('Right', math.pi)):
            rot(f'{s}UpLeg', [(t, q(X, -A * math.sin(2 * math.pi * t / d + ph))) for t in ts])
            rot(f'{s}Leg', [(t, q(X, K * max(0, math.sin(2 * math.pi * t / d + ph + 1.2)))) for t in ts])
            rot(f'{s}Arm', [(t, q(X, A * 0.8 * math.sin(2 * math.pi * t / d + ph))) for t in ts])
        rot('Spine', [(t, q(X, 0.05 if name == 'walk' else 0.25)) for t in ts]); mov('Hips', [(t, (0, 1.0 - (0.0 if name == 'walk' else 0.05) + 0.03 * abs(math.sin(2 * math.pi * t / d)), 0)) for t in ts])
    elif name == 'jump':
        ts = T(9, 1.0); k = lambda t: math.sin(math.pi * t)
        for s in ('Left', 'Right'):
            rot(f'{s}UpLeg', [(t, q(X, -1.0 * k(t))) for t in ts]); rot(f'{s}Leg', [(t, q(X, 1.6 * k(t))) for t in ts]); rot(f'{s}Arm', [(t, q(X, -2.4 * k(t))) for t in ts])
    elif name == 'slash':
        ts = T(13, 0.8); kk = lambda t: min(1, max(0, (t - 0.2) / 0.3))
        rot('RightArm', [(t, q(X, -2.8 + 3.2 * kk(t) if t > 0.2 else -2.8 * t / 0.2)) for t in ts]); rot('Spine', [(t, q(Y, -0.5 + 1.0 * kk(t))) for t in ts])
    elif name == 'roll':
        ts = T(13, 0.8); mov('Hips', [(t, (0, 0.55 + 0.1 * math.cos(2 * math.pi * t / 0.8), 0)) for t in ts]); rot('Hips', [(t, q(X, 2 * math.pi * t / 0.8)) for t in ts])
        for s in ('Left', 'Right'): rot(f'{s}UpLeg', [(t, q(X, -1.6)) for t in ts]); rot(f'{s}Leg', [(t, q(X, 2.2)) for t in ts])
    elif name == 'death':
        ts = T(9, 1.6); mov('Hips', [(t, (0, 1.0 - 0.8 * min(1, t / 1.0), 0)) for t in ts]); rot('Hips', [(t, q(X, -1.45 * min(1, t / 1.0))) for t in ts])
    return tr
def write(path, name, with_body=True):
    blob = bytearray(); views = []; accs = []
    def add(arr, ctype, typ, target=None, minmax=False):
        a = np.ascontiguousarray(arr); off = len(blob); blob.extend(a.tobytes());
        while len(blob) % 4: blob.append(0)
        views.append({'buffer': 0, 'byteOffset': off, 'byteLength': a.nbytes, **({'target': target} if target else {})})
        acc = {'bufferView': len(views) - 1, 'componentType': ctype, 'count': len(a), 'type': typ}
        if minmax: acc['min'] = a.min(0).tolist(); acc['max'] = a.max(0).tolist()
        accs.append(acc); return len(accs) - 1
    nodes = []
    for n, par, p in B:
        lp = pos[n] - (pos[par] if par else 0); nodes.append({'name': f'mixamorig:{n}', 'translation': lp.tolist(), 'children': []})
    for i, (n, par, p) in enumerate(B):
        if par: nodes[idx[par]]['children'].append(i)
    for nd in nodes:
        if not nd['children']: del nd['children']
    meshes, mats = [], [{'name': 'cloth', 'pbrMetallicRoughness': {'baseColorFactor': [0.18, 0.2, 0.32, 1]}}, {'name': 'skin', 'pbrMetallicRoughness': {'baseColorFactor': [0.78, 0.6, 0.45, 1]}}]
    extra = []
    if with_body:
        prims = []
        for mi, key in enumerate(('cloth', 'skin')):
            V, Nn, I, J, W = [], [], [], [], []
            for v, nn, ii, bone in parts[key]:
                b0 = len(V); V += v; Nn += nn; I += [b0 + k for k in ii]; J += [[bone, 0, 0, 0]] * len(v); W += [[1, 0, 0, 0]] * len(v)
            prims.append({'attributes': {'POSITION': add(np.array(V, np.float32), 5126, 'VEC3', 34962, True), 'NORMAL': add(np.array(Nn, np.float32), 5126, 'VEC3', 34962),
                                         'JOINTS_0': add(np.array(J, np.uint8), 5121, 'VEC4', 34962), 'WEIGHTS_0': add(np.array(W, np.float32), 5126, 'VEC4', 34962)},
                          'indices': add(np.array(I, np.uint16), 5123, 'SCALAR', 34963), 'material': mi})
        meshes.append({'name': 'Body', 'primitives': prims})
        ibm = np.array([np.linalg.inv(np.array([[1, 0, 0, pos[n][0]], [0, 1, 0, pos[n][1]], [0, 0, 1, pos[n][2]], [0, 0, 0, 1]])).T.flatten() for n, _, _ in B], np.float32)
        skin = {'joints': list(range(len(B))), 'inverseBindMatrices': add(ibm, 5126, 'MAT4'), 'skeleton': 0}
        nodes.append({'name': 'Body', 'mesh': 0, 'skin': 0}); extra = [len(nodes) - 1]
    tr = anim(name); samplers, channels = [], []
    for bone, d in tr.items():
        for kind, keys in d.items():
            t = np.array([k[0] for k in keys], np.float32); v = np.array([k[1] for k in keys], np.float32)
            if kind == 'pos': v = v - (pos[B[idx[bone]][1]] if B[idx[bone]][1] else 0)
            inp = add(t, 5126, 'SCALAR', None, True); out = add(v, 5126, 'VEC4' if kind == 'rot' else 'VEC3')
            samplers.append({'input': inp, 'output': out, 'interpolation': 'LINEAR'}); channels.append({'sampler': len(samplers) - 1, 'target': {'node': idx[bone], 'path': 'rotation' if kind == 'rot' else 'translation'}})
    gltf = {'asset': {'version': '2.0', 'generator': 'samsara testbot'}, 'scene': 0, 'scenes': [{'nodes': [0] + extra}], 'nodes': nodes, 'buffers': [{'byteLength': len(blob)}], 'bufferViews': views, 'accessors': accs,
            'animations': [{'name': f'Armature|mixamo.com|{name}', 'samplers': samplers, 'channels': channels}]}
    if with_body: gltf.update({'meshes': meshes, 'materials': mats, 'skins': [skin]})
    js = json.dumps(gltf).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
    glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + bytes(blob)
    path.write_bytes(glb)
for n in ['idle', 'walk', 'run', 'jump', 'slash', 'roll', 'death']: write(OUT / f'{n}.glb', n, True)
print('wrote', sorted(p.name for p in OUT.glob('*.glb')))
