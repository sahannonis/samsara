"""Cut the night horse's parts out of Sahan's sheet (art/horse/night-horse-sheet.png) into transparent PNGs.
The sheet's background is a soft glow, so anything smooth (relative to its brightness) and connected to the
sheet's edge is background; each of the 12 parts is what is left. Run: python art/horse/cut_parts.py"""
import numpy as np, cv2, json, pathlib
from scipy import ndimage as ndi
HERE = pathlib.Path(__file__).parent
SCALE = 0.55   # the parts are painted large; the game shows the horse about 100 units long
im = cv2.imread(str(HERE / 'night-horse-sheet.png')).astype(np.float32)
g = im.mean(axis=2); gb = cv2.GaussianBlur(g, (0, 0), 1.2)
rel = np.hypot(cv2.Sobel(gb, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(gb, cv2.CV_32F, 0, 1, ksize=3)) / (gb + 12)
lab, n = ndi.label(rel < 0.25); border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
fg = ndi.binary_fill_holes(~np.isin(lab, list(border)))
lab, n = ndi.label(fg); sizes = ndi.sum(fg, lab, range(1, n + 1))
keep = [i + 1 for i, s in enumerate(sizes) if s > 4000]
objs = ndi.find_objects(lab)
parts = []
for i in keep:
    sl = objs[i - 1]; cy = (sl[0].start + sl[0].stop) / 2; cx = (sl[1].start + sl[1].stop) / 2
    parts.append((i, sl, cx, cy))
top = sorted([p for p in parts if p[3] < 520], key=lambda p: p[2]); bot = sorted([p for p in parts if p[3] >= 520], key=lambda p: p[2])
names = ['head', 'neck', 'body', 'tail'] + ['legFL_up', 'legFL_lo', 'legFR_up', 'legFR_lo', 'legBL_up', 'legBL_lo', 'legBR_up', 'legBR_lo']
assert len(top) == 4 and len(bot) == 8, (len(top), len(bot))
out = HERE / 'parts'; out.mkdir(exist_ok=True); meta = {}
rgb = cv2.imread(str(HERE / 'night-horse-sheet.png'), cv2.IMREAD_COLOR)
for name, (i, sl, cx, cy) in zip(names, top + bot):
    pad = 6; y0, y1 = max(0, sl[0].start - pad), min(im.shape[0], sl[0].stop + pad); x0, x1 = max(0, sl[1].start - pad), min(im.shape[1], sl[1].stop + pad)
    m = ndi.binary_fill_holes(ndi.binary_closing(np.pad(lab[y0:y1, x0:x1] == i, 8), iterations=5))[8:-8, 8:-8].astype(np.float32)   # close the gaps between hair wisps
    a = cv2.GaussianBlur(ndi.binary_erosion(m, iterations=1).astype(np.float32), (0, 0), 0.9)   # a soft, slightly pulled-in edge
    rgba = np.dstack([rgb[y0:y1, x0:x1], (a * 255).astype(np.uint8)])
    w, h = int((x1 - x0) * SCALE), int((y1 - y0) * SCALE)
    small = cv2.resize(rgba, (w, h), interpolation=cv2.INTER_AREA)
    cv2.imwrite(str(out / f'{name}.png'), small)
    meta[name] = {'sheet_box': [int(x0), int(y0), int(x1), int(y1)], 'size': [w, h]}
(out / 'parts.json').write_text(json.dumps(meta, indent=1))
print(json.dumps(meta))

# Each leg piece on the sheet is a whole leg, top to hoof. A leg in the game is the top half of its first piece
# (to the knee or hock) over the bottom half of its second piece, so it can bend at the joint.
def crop_rows(name, v0, v1, fade_top=None, fade_bot=None):
    im = cv2.imread(str(out / f'{name}.png'), cv2.IMREAD_UNCHANGED); h = im.shape[0]
    a, b = int(v0 * h), int(v1 * h); piece = im[a:b].copy(); alpha = piece[..., 3].astype(np.float32); n = piece.shape[0]
    ys = np.arange(n)[:, None] / h + v0
    if fade_top: alpha *= np.clip((ys - v0) / (fade_top - v0), 0, 1)
    if fade_bot: alpha *= np.clip((v1 - ys) / (v1 - fade_bot), 0, 1)
    piece[..., 3] = alpha.astype(np.uint8); return piece
for leg in ['FL', 'FR', 'BL', 'BR']:
    cv2.imwrite(str(out / f'leg{leg}_thigh.png'), crop_rows(f'leg{leg}_up', 0.0, 0.57, fade_bot=0.5))
    cv2.imwrite(str(out / f'leg{leg}_shin.png'), crop_rows(f'leg{leg}_lo', 0.36, 1.0, fade_top=0.41))
print('legs split')
