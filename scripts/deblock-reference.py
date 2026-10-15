#!/usr/bin/env python3
"""Clean the reference's compression blocks (it came as a compressed image; enlarged 3.4x on a
Retina screen its 8x8 blocks would show): smooth gently where the picture is flat (where blocks
show), and a little along its own lanes everywhere (which melts block steps across the lanes
without blurring the lanes themselves)."""
# usage: python3 scripts/deblock-reference.py public/hole-ref.webp public/hole-ref.webp (then re-run the bake)
import numpy as np, sys
from PIL import Image
from scipy import ndimage
src, out = sys.argv[1], sys.argv[2]
A = np.asarray(Image.open(src).convert('RGB')).astype(np.float64)
L = A.mean(2)
# Lane orientation (structure tensor), as in the bake.
Ls = ndimage.gaussian_filter(L, 1.0)
gx, gy = ndimage.sobel(Ls, 1), ndimage.sobel(Ls, 0)
jxx, jxy, jyy = (ndimage.gaussian_filter(a, 3.0) for a in (gx * gx, gx * gy, gy * gy))
tr = np.maximum(jxx + jyy, 1e-9)
l1 = tr / 2 + np.sqrt(np.maximum(tr ** 2 / 4 - (jxx * jyy - jxy ** 2), 0))
coh = (2 * l1 - tr) / tr
th = 0.5 * np.arctan2(2 * jxy, jxx - jyy)          # gradient orientation
tx, ty = -np.sin(th), np.cos(th)                    # along the lanes (x right, y down)
H, W = L.shape
ys, xs = np.mgrid[0:H, 0:W].astype(np.float64)
def at(img, dx, dy):
    return np.stack([ndimage.map_coordinates(img[..., c], [ys + dy, xs + dx], order=1, mode='nearest') for c in range(3)], -1)
# Along the lanes, ±2 px (weights 1, .75, .4).
acc = A * 1.0; ws = 1.0
for s, w in ((0.9, 0.75), (1.8, 0.4)):
    acc += (at(A, tx * s, ty * s) + at(A, -tx * s, -ty * s)) * w; ws += 2 * w
along = acc / ws
k = np.clip((coh - 0.08) / 0.3, 0, 1)[..., None]
B = A + (along - A) * k
# Flat areas: a gentle isotropic smooth.
G = np.hypot(gx, gy) / 8.0
flat = (1 - np.clip((G - 1.5) / 5.0, 0, 1))[..., None]
S = np.stack([ndimage.gaussian_filter(B[..., c], 0.75) for c in range(3)], -1)
B = B + (S - B) * flat * 0.6
B = np.clip(np.round(B), 0, 255).astype(np.uint8)
Image.fromarray(B).save(out, lossless=True, quality=100, method=6) if out.endswith('.webp') else Image.fromarray(B).save(out)
def grid(a):
    a = a.mean(2) if a.ndim == 3 else a
    dy = np.abs(np.diff(a, axis=0)).mean(1); by = [dy[i::8].mean() for i in range(8)]
    dx = np.abs(np.diff(a, axis=1)).mean(0); bx = [dx[i::8].mean() for i in range(8)]
    return max(by) / np.median(by), max(bx) / np.median(bx)
print('block grid ratio rows/cols  before %.2f/%.2f  after %.2f/%.2f' % (*grid(A), *grid(B.astype(float))))
print('mean change %.2f levels' % np.abs(B.astype(float) - A).mean())
