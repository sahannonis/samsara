"""Pack Mixamo moves exported from Blender into small .glb files for the game.

Blender keeps every move it has seen, so each exported file also carries the moves exported before it. This takes each
file's own (newest) move, keeps the body once (from the first file, with only its colour texture), and writes:
  idle.glb (the body and its idle), and one small file per move with only the move in it.

    python art/characters/pack_mixamo.py OUT_DIR idle=Idle.glb walk=walking.glb run=running.glb jump=jump.glb roll=roll.glb slash=swordslash.glb death=dying.glb
The order matters: give the files in the order they were exported.

More moves for a body already packed (each file's own move is its last one):
    python art/characters/pack_mixamo.py --moves OUT_DIR block=Blocking.glb climb=Climbing.glb ..."""
import json, struct, sys, pathlib

def read(path):
    b = pathlib.Path(path).read_bytes(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + n])
    o = 20 + n; bl = struct.unpack('<I', b[o:o + 4])[0]; return j, b[o + 8:o + 8 + bl]

def write(path, j, bin_, keep_views):
    """rebuild the buffer with only the buffer views still in use, and renumber them"""
    old = j['bufferViews']; new, out, remap = [], bytearray(), {}
    for i in sorted(keep_views):
        v = dict(old[i]); data = bin_[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
        while len(out) % 4: out.append(0)
        v['byteOffset'] = len(out); v['buffer'] = 0; out.extend(data); remap[i] = len(new); new.append(v)
    j['bufferViews'] = new; j['buffers'] = [{'byteLength': len(out)}]
    for a in j.get('accessors', []):
        if 'bufferView' in a: a['bufferView'] = remap[a['bufferView']]
        if 'sparse' in a: raise SystemExit('sparse accessors are not handled')
    for im in j.get('images', []):
        if 'bufferView' in im: im['bufferView'] = remap[im['bufferView']]
    js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
    while len(out) % 4: out.append(0)
    glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + bytes(out)
    pathlib.Path(path).write_bytes(glb); return len(glb)

def anim_only(j, anim, name):
    """the nodes (for their names) and one move; accessors renumbered"""
    accs, used = [], {}
    def take(i):
        if i not in used: used[i] = len(accs); accs.append(j['accessors'][i])
        return used[i]
    samplers = [{**s, 'input': take(s['input']), 'output': take(s['output'])} for s in anim['samplers']]
    nodes = [{k: v for k, v in nd.items() if k in ('name', 'translation', 'rotation', 'scale', 'children')} for nd in j['nodes']]
    out = {'asset': j['asset'], 'scene': 0, 'scenes': j['scenes'], 'nodes': nodes, 'accessors': accs, 'bufferViews': j['bufferViews'],
           'animations': [{'name': name, 'samplers': samplers, 'channels': anim['channels']}]}
    return out, {a['bufferView'] for a in accs if 'bufferView' in a}

def body_only(j, anim, name):
    """the body, its skin and its colour texture, and its own move"""
    j = json.loads(json.dumps(j))
    for m in j.get('materials', []):
        m.pop('normalTexture', None); m.pop('occlusionTexture', None); m.pop('emissiveTexture', None); m.pop('extensions', None)
        p = m.get('pbrMetallicRoughness', {}); p.pop('metallicRoughnessTexture', None)
    keep_tex = sorted({m['pbrMetallicRoughness']['baseColorTexture']['index'] for m in j.get('materials', []) if 'baseColorTexture' in m.get('pbrMetallicRoughness', {})})
    tmap = {t: i for i, t in enumerate(keep_tex)}; textures = [j['textures'][t] for t in keep_tex]
    keep_img = sorted({t['source'] for t in textures}); imap = {s: i for i, s in enumerate(keep_img)}
    j['images'] = [j['images'][s] for s in keep_img]; j['textures'] = [{**t, 'source': imap[t['source']]} for t in textures]
    for m in j.get('materials', []):
        p = m.get('pbrMetallicRoughness', {})
        if 'baseColorTexture' in p: p['baseColorTexture']['index'] = tmap[p['baseColorTexture']['index']]
    j['animations'] = [{**anim, 'name': name}]
    j.pop('extensionsUsed', None); j.pop('extensionsRequired', None)
    # accessors in use: meshes, skins, the move
    used = set()
    for me in j.get('meshes', []):
        for pr in me['primitives']:
            for k, v in pr['attributes'].items():
                if k.startswith('TEXCOORD_') and k != 'TEXCOORD_0': continue
                used.add(v)
            pr['attributes'] = {k: v for k, v in pr['attributes'].items() if not (k.startswith('TEXCOORD_') and k != 'TEXCOORD_0')}
            if 'indices' in pr: used.add(pr['indices'])
            pr.pop('targets', None)
    for s in j.get('skins', []):
        if 'inverseBindMatrices' in s: used.add(s['inverseBindMatrices'])
    for s in j['animations'][0]['samplers']: used |= {s['input'], s['output']}
    order = sorted(used); amap = {a: i for i, a in enumerate(order)}; j['accessors'] = [j['accessors'][a] for a in order]
    for me in j.get('meshes', []):
        for pr in me['primitives']:
            pr['attributes'] = {k: amap[v] for k, v in pr['attributes'].items()}
            if 'indices' in pr: pr['indices'] = amap[pr['indices']]
    for s in j.get('skins', []):
        if 'inverseBindMatrices' in s: s['inverseBindMatrices'] = amap[s['inverseBindMatrices']]
    for s in j['animations'][0]['samplers']: s['input'], s['output'] = amap[s['input']], amap[s['output']]
    views = {a['bufferView'] for a in j['accessors'] if 'bufferView' in a} | {im['bufferView'] for im in j['images'] if 'bufferView' in im}
    return j, views

if __name__ == '__main__' and len(sys.argv) > 2 and sys.argv[1] == '--moves':
    # more moves for a body already packed: each file's own move is its last one (Blender adds the newest at the end)
    out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
    for arg in sys.argv[3:]:
        name, path = arg.split('=', 1); j, b = read(path); anim = j['animations'][-1]
        dur = max(j['accessors'][s['input']].get('max', [0])[0] for s in anim['samplers'])
        jj, views = anim_only(j, anim, name); size = write(out / f'{name}.glb', jj, b, views)
        print(f'{name}.glb  {size // 1024} KB  {dur:.2f} s')
    sys.exit(0)
if __name__ == '__main__':
    out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    seen = set()
    for k, arg in enumerate(sys.argv[2:]):
        name, path = arg.split('=', 1); j, b = read(path)
        own = [a for a in j['animations'] if a['name'] not in seen] or j['animations'][-1:]
        anim = own[-1]; seen |= {a['name'] for a in j['animations']}
        dur = max(j['accessors'][s['input']].get('max', [0])[0] for s in anim['samplers'])
        if k == 0: jj, views = body_only(j, anim, name)
        else: jj, views = anim_only(j, anim, name)
        size = write(out / f'{name}.glb', jj, b, views)
        print(f'{name}.glb  {size // 1024} KB  move "{anim["name"]}"  {dur:.2f} s')
