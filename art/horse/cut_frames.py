"""Cut the night horse's animation frames out of Sahan's sheet (art/horse/night-horse-frames-sheet.png).
Each row (idle, walk, run, jump) is cut into its frames; each frame is lined up on its torso (so the horse does not
wobble from frame to frame) and on its hooves, then packed into one picture with a table of where each frame is and
where the saddle sits. Run: python art/horse/cut_frames.py"""
import numpy as np, cv2, json, pathlib
from scipy import ndimage as ndi
HERE = pathlib.Path(__file__).parent
rgb = cv2.imread(str(HERE / 'night-horse-frames-sheet.png'))
g = rgb.astype(np.float32).mean(axis=2); gb = cv2.GaussianBlur(g, (0, 0), 1.2)
rel = np.hypot(cv2.Sobel(gb, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(gb, cv2.CV_32F, 0, 1, ksize=3)) / (gb + 12)
ROWS = {'idle': (556, 662), 'walk': (682, 790), 'run': (800, 902), 'jump': (912, 1010)}
X0, X1 = 40, 1112
frames = {}
for name, (y0, y1) in ROWS.items():
    sub = rel[y0:y1, X0:X1]
    lab, n = ndi.label(sub < 0.4)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ndi.binary_fill_holes(~np.isin(lab, list(border)))
    core = ndi.binary_opening(fg, iterations=2)                       # cut thin bridges to the background's pattern
    lab2, n2 = ndi.label(core); objs = ndi.find_objects(lab2)
    found = []
    for i, sl in enumerate(objs):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start; area = (lab2[sl] == i + 1).sum()
        if area > 2500 and 45 < h and 60 < w < 190: found.append((sl[1].start, i + 1))
    found.sort()
    out = []
    for _, i in found:
        m = ndi.binary_dilation(lab2 == i + 0, iterations=2) & fg       # grow back the hair the opening took
        m = ndi.binary_fill_holes(ndi.binary_closing(m, iterations=2))
        ys, xs = np.nonzero(m)
        bottom = ys.max(); top = ys.min(); h = bottom - top
        band = (ys > top + h * 0.35) & (ys < top + h * 0.65)           # the torso band: the most stable part of a moving horse
        ax = xs[band].mean()
        cols = [c for c in range(int(ax) - 6, int(ax) + 3)]
        back = np.median([ys[xs == c].min() for c in cols if (xs == c).any()])
        out.append({'mask': m, 'ax': float(ax), 'bottom': int(bottom), 'back': float(back)})
    frames[name] = out
    print(name, len(out), 'frames')
# every frame stands on its lowest hoof: the game itself lifts the horse in a jump
for fs in frames.values():
    for f in fs: f['ground'] = f['bottom']
# AI frames are not all drawn at one size: scale each frame of a loop so its back is as high as the loop's middle one,
# or the horse would swell and shrink as it plays
for name, fs in frames.items():
    if name == 'jump': continue
    med = float(np.median([f['ground'] - f['back'] for f in fs]))
    for f in fs:
        k = med / (f['ground'] - f['back'])
        if abs(k - 1) < 0.01: continue
        H0, W0 = f['mask'].shape; y0, _ = ROWS[name]
        M = np.float32([[k, 0, f['ax'] * (1 - k)], [0, k, f['ground'] * (1 - k)]])   # scale about the anchor on the ground
        f['mask'] = cv2.warpAffine(f['mask'].astype(np.uint8), M, (W0, H0), flags=cv2.INTER_NEAREST) > 0
        f['rgb'] = cv2.warpAffine(rgb[y0:y0 + H0, X0:X0 + W0], M, (W0, H0), flags=cv2.INTER_LINEAR)
        f['back'] = f['ground'] - (f['ground'] - f['back']) * k
# one cell size for every frame, with the anchor (torso centre over the ground) at the same place in each cell
L = max(f['ax'] - np.nonzero(f['mask'])[1].min() for fs in frames.values() for f in fs) + 4
R = max(np.nonzero(f['mask'])[1].max() - f['ax'] for fs in frames.values() for f in fs) + 4
T = max(f['ground'] - np.nonzero(f['mask'])[0].min() for fs in frames.values() for f in fs) + 4
CW, CH, AX, AY = int(L + R), int(T + 6), int(L), int(T)
total = sum(len(v) for v in frames.values()); cols = 8; rows = (total + cols - 1) // cols
atlas = np.zeros((rows * CH, cols * CW, 4), np.uint8); table = {}; k = 0
for name, fs in frames.items():
    table[name] = []
    for f in fs:
        y0, _ = ROWS[name]; r, c = divmod(k, cols)
        m = f['mask'].astype(np.float32); a = cv2.GaussianBlur(ndi.binary_erosion(m, iterations=1).astype(np.float32), (0, 0), 0.7)
        src = f['rgb'] if 'rgb' in f else rgb[y0:y0 + m.shape[0], X0:X0 + m.shape[1]]
        dx, dy = int(round(AX - f['ax'])), int(round(AY - f['ground']))
        cell = np.zeros((CH, CW, 4), np.uint8)
        ys, xs = np.nonzero(m > 0)
        ty, tx = ys + dy, xs + dx; ok = (ty >= 0) & (ty < CH) & (tx >= 0) & (tx < CW)
        cell[ty[ok], tx[ok], :3] = src[ys[ok], xs[ok]]; cell[ty[ok], tx[ok], 3] = (a[ys[ok], xs[ok]] * 255).astype(np.uint8)
        atlas[r * CH:(r + 1) * CH, c * CW:(c + 1) * CW] = cell
        table[name].append({'cell': k, 'saddle': [0.0, float(f['ground'] - f['back'] + 1)]})   # saddle over the anchor, height above the ground
        k += 1
cv2.imwrite(str(HERE / 'parts' / 'frames.png'), atlas)
meta = {'cell': [CW, CH], 'cols': cols, 'anchor': [AX, AY], 'facing': 1, 'anims': table}
(HERE / 'parts' / 'frames.json').write_text(json.dumps(meta))
print('cell', CW, CH, 'anchor', AX, AY, 'atlas', atlas.shape)
