#!/usr/bin/env python3
"""Solve the disk textures (public/disk-*.webp) from the reference picture (public/hole-ref.webp),
the map of edges between surfaces where motion holds still, of the wings' removed corners, and of
the bright band's edge (public/disk-seams.webp, R, G and B), and the
picture's lane field round the hole (public/disk-lanes.webp) that the arcs stream along, and its
lane orientation everywhere (public/disk-flow.webp) for drawing it far larger than itself.

Each reference pixel is traced through the scene's geometry (compare.html in bake mode: which
surface the ray hits, and where), and its colour is written into that surface's texture at the hit.
The texels are then refined so a GPU bilinear lookup at each pixel's own hit returns that pixel's
colour, and alpha marks where the material may flow.

usage: npm run dev, then  python3 scripts/bake-disk.py [http://localhost:5173]
needs Google Chrome, numpy, scipy and Pillow.
"""
import glob, io, json, os, subprocess, sys, tempfile, time
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5173').rstrip('/')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
W0, H0 = 720, 1280
# name, hit code, width (azimuth), height (radius), r0, r1 — must match BAKED in src/blackhole.ts.
LAYOUT = [('inner', 2, 2048, 512, 2.6, 14.6), ('outer', 3, 4096, 512, 3.5, 28.5), ('lensed', 4, 2048, 512, 3.5, 28.5)]
FLOW = 0.5  # the most flow (rad at r = 3) the page uses


def shoot(hashobj):
    """Render compare.html headless; the window is taller than the canvas (Chrome's own chrome)."""
    out = tempfile.mktemp(suffix='.png')
    prof = tempfile.mkdtemp()
    url = f'{URL}/compare.html#' + json.dumps(hashobj).replace(' ', '')
    p = subprocess.Popen([CHROME, '--headless=new', f'--user-data-dir={prof}', '--no-first-run', '--hide-scrollbars',
                          '--force-device-scale-factor=1', f'--window-size={W0},{H0 + 120}', '--virtual-time-budget=9000',
                          f'--screenshot={out}', url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    last, t = -1, time.time()
    while time.time() - t < 90:
        time.sleep(0.25)
        if os.path.exists(out) and os.path.getsize(out) > 0:
            if os.path.getsize(out) == last:
                break
            last = os.path.getsize(out)
    p.kill()
    return np.asarray(Image.open(out).convert('RGB')).astype(np.int64)[:H0, :W0]


def coords(rr, pp, W, H, r0, r1):
    return (pp / (2 * np.pi) + 0.5) * W - 0.5, (rr - r0) / (r1 - r0) * H - 0.5


def taps(x, y, W, H):
    """GPU bilinear: texel indices and weights (repeat in azimuth, clamp in radius)."""
    x0, y0 = np.floor(x), np.floor(y)
    fx, fy = x - x0, y - y0
    x0, y0 = x0.astype(int), y0.astype(int)
    xs = [x0 % W, (x0 + 1) % W]
    ys = [np.clip(y0, 0, H - 1), np.clip(y0 + 1, 0, H - 1)]
    idx, w = [], []
    for j, wy in ((0, 1 - fy), (1, fy)):
        for i, wx in ((0, 1 - fx), (1, fx)):
            idx.append(ys[j] * W + xs[i])
            w.append(wx * wy)
    return idx, w


def wing_corners(code):
    """The two corners of the disk's wings that were taken out of the picture (upper left and lower
    right, beyond the photon ring, on open sky or the faint outer inner disk): 1 there, 0 elsewhere,
    soft-edged. No lanes may run round the hole there, and the disk's own orbital detail and motion
    hold still, or the page would draw the arcs back in."""
    CX, CY = 356.0, 640.0
    ys, xs = np.mgrid[0:code.shape[0], 0:code.shape[1]].astype(np.float64)
    rx, ry = xs - CX, -(ys - CY)
    th = (np.degrees(np.arctan2(ry, rx)) + 360) % 360
    rad = np.hypot(rx, ry)

    def band(a, b, w):
        t = (th - a) % 360
        span = (b - a) % 360
        return np.clip(t / w, 0, 1) * np.clip((span - t) / w, 0, 1) * (t <= span)

    sector = np.maximum(band(72, 203, 10), band(255, 18, 10))
    radial = np.clip((rad - 120) / 14, 0, 1) * (1 - np.clip((rad - 230) / 30, 0, 1))   # (clear of the ring's own arcs)
    open_ = ndimage.gaussian_filter(((code == 0) | (code == 2)).astype(np.float64), 3.0)
    return sector * radial * open_


def bake_lanes(ref, code):
    """The picture's light lanes round the hole (public/disk-lanes.webp): RG the lane direction (y up,
    turned to circulate counter-clockwise), B its weight (how clearly the lane runs round the hole).
    Where light must not be carried across (the bright band's edge) is in disk-seams.webp's B."""
    CX, CY, PX = 356.0, 640.0, 11.5
    lum = ndimage.gaussian_filter(ref.mean(2), 1.2)
    gx, gy = ndimage.sobel(lum, 1), ndimage.sobel(lum, 0)
    jxx, jxy, jyy = (ndimage.gaussian_filter(a, 4.0) for a in (gx * gx, gx * gy, gy * gy))
    tr, det = jxx + jyy, jxx * jyy - jxy ** 2
    l1 = tr / 2 + np.sqrt(np.maximum(tr ** 2 / 4 - det, 0))
    coh = (2 * l1 - tr) / np.maximum(tr, 1e-9)
    ang = 0.5 * np.arctan2(2 * jxy, jxx - jyy)
    tux, tuy = -np.sin(ang), -np.cos(ang)  # along the lanes, y up
    ys, xs = np.mgrid[0:code.shape[0], 0:code.shape[1]].astype(np.float64)
    rx, ry = xs - CX, -(ys - CY)
    cr = rx * tuy - ry * tux
    sgn = np.where(cr >= 0, 1.0, -1.0)
    tux, tuy = tux * sgn, tuy * sgn
    rad = np.hypot(rx, ry)
    conc = np.abs(cr) / np.maximum(rad, 1e-6)
    w = np.clip((coh - 0.05) / 0.2, 0, 1) * np.clip((conc - 0.25) / 0.35, 0, 1) * (1 - np.clip((rad / PX - 18) / 5, 0, 1))
    w = np.clip(ndimage.gaussian_filter(w, 5.0) * 1.4, 0, 1)
    w *= 1 - wing_corners(code)
    tux, tuy = ndimage.gaussian_filter(tux, 1.5), ndimage.gaussian_filter(tuy, 1.5)
    n = np.maximum(np.hypot(tux, tuy), 1e-6)
    rgb = np.stack([np.round((tux / n * 0.5 + 0.5) * 255), np.round((tuy / n * 0.5 + 0.5) * 255), np.round(w * 255)], -1)
    Image.fromarray(rgb.astype(np.uint8), 'RGB').save(os.path.join(ROOT, 'public', 'disk-lanes.webp'), lossless=True, quality=100, method=6)


def bake_flow(ref, code):
    """The picture's lane orientation everywhere (public/disk-flow.webp, half size): RG the doubled-angle
    vector of the lane direction (image axes, y down), its length the lanes' coherence. Used to
    smooth and refine the picture along its own lanes when it is drawn much larger than itself."""
    lum = ndimage.gaussian_filter(ref.mean(2), 1.2)
    gx, gy = ndimage.sobel(lum, 1), ndimage.sobel(lum, 0)
    jxx, jxy, jyy = (ndimage.gaussian_filter(a, 4.0) for a in (gx * gx, gx * gy, gy * gy))
    tr = np.maximum(jxx + jyy, 1e-9)
    # The gradient's doubled angle is (jxx - jyy, 2 jxy) / tr; the lanes run at right angles to it.
    d2 = np.stack([-(jxx - jyy) / tr, -2 * jxy / tr], -1)
    # In the wing corners only lanes that run outwards (the jets, the streaks) survive: the ones
    # running round the hole would draw the removed arcs back in.
    CX, CY = 356.0, 640.0
    ys, xs = np.mgrid[0:code.shape[0], 0:code.shape[1]].astype(np.float64)
    rad = np.maximum(np.hypot(xs - CX, ys - CY), 1e-6)
    r2 = np.stack([((xs - CX) ** 2 - (ys - CY) ** 2) / rad ** 2, 2 * (xs - CX) * (ys - CY) / rad ** 2], -1)   # radial, doubled angle
    outward = np.clip((np.sum(d2 * r2, -1) / np.maximum(np.hypot(d2[..., 0], d2[..., 1]), 1e-6) - 0.3) / 0.5, 0, 1)
    q = wing_corners(code)
    d2 *= (1 - q * (1 - outward))[..., None]
    d2 = d2[::2, ::2] * 0.5 + d2[1::2, 1::2] * 0.5
    rgb = np.concatenate([np.round((d2 * 0.5 + 0.5) * 255), np.full(d2.shape[:2] + (1,), 128.0)], -1)
    Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB').save(os.path.join(ROOT, 'public', 'disk-flow.webp'), lossless=True, quality=100, method=6)


def main():
    ref = np.asarray(Image.open(os.path.join(ROOT, 'public', 'hole-ref.webp')).convert('RGB')).astype(np.float64)
    b1, b2 = shoot({'bake': 1}), shoot({'bake': 2})
    code = np.round(b1[..., 0] / 40).astype(int)
    r = (b1[..., 1] * 256 + b1[..., 2]) / 65535 * 40
    phi = ((b2[..., 1] * 256 + b2[..., 2]) / 65535 - 0.5) * 2 * np.pi
    print('hits', {c: int((code == c).sum()) for c in range(5)})
    # Where motion must hold still: distance to the nearest edge between surfaces (sky and shadow
    # count as one), in reference pixels, 24 px and beyond saturated.
    cls = np.where(code <= 1, 0, code)
    edge = np.zeros(cls.shape, bool)
    for a, b in (((slice(None), slice(1, None)), (slice(None), slice(None, -1))), ((slice(1, None), slice(None)), (slice(None, -1), slice(None)))):
        diff = cls[a] != cls[b]
        edge[a] |= diff
        edge[b] |= diff
    seams = np.clip(ndimage.distance_transform_edt(~edge) / 24.0, 0, 1)
    # G: the wing corners, where the page treats the picture as open sky (streaming outwards, no
    # orbital detail or motion).
    corners = wing_corners(code)
    # B: which side of the bright band's edge (the outer disk seen directly, passing in front of the
    # ring), and how far: 0.5 on the edge, up on the band, down off it, saturated 16 px away. Smoothed,
    # so the edge is a clean line rather than the pixels' staircase however far the page enlarges it
    # (the lanes' light is carried up to it, never across).
    band = code == 3
    side = ndimage.gaussian_filter(ndimage.distance_transform_edt(band) - ndimage.distance_transform_edt(~band), 1.5)
    side = np.clip(0.5 + side / 32.0, 0, 1)
    rgb = np.stack([np.round(seams * 255), np.round(corners * 255), np.round(side * 255)], -1)
    Image.fromarray(rgb.astype(np.uint8), 'RGB').save(
        os.path.join(ROOT, 'public', 'disk-seams.webp'), lossless=True, quality=100, method=6)

    bake_lanes(ref, code)
    bake_flow(ref, code)

    lum = ref.mean(2)
    var = np.maximum(ndimage.maximum_filter(lum, 5) - lum, lum - ndimage.minimum_filter(lum, 5))

    for name, c, W, H, r0, r1 in LAYOUT:
        sel = code == c
        rr, pp, col = r[sel], phi[sel], ref[sel]
        x, y = coords(rr, pp, W, H, r0, r1)
        iu = np.round(x).astype(int) % W
        iv = np.clip(np.round(y).astype(int), 0, H - 1)
        acc = np.zeros((H, W, 3))
        cnt = np.zeros((H, W))
        np.add.at(acc, (iv, iu), col)
        np.add.at(cnt, (iv, iu), 1)
        filled = cnt > 0
        tex = np.zeros((H, W, 3))
        tex[filled] = acc[filled] / cnt[filled][:, None]

        # Fill the gaps: nearest data close by, a smooth normalised blur further out (wrapping in azimuth).
        pad = W // 8
        wrap = lambda a: np.concatenate([a[:, -pad:], a, a[:, :pad]], 1)
        fp, tp = wrap(filled), wrap(tex)
        dist, (iy, ix) = ndimage.distance_transform_edt(~fp, return_indices=True)
        nearest = tp[iy, ix]
        s = 12 * W / 2048
        wgt = ndimage.gaussian_filter(fp.astype(np.float64), s, mode='wrap')
        smooth = np.stack([ndimage.gaussian_filter(tp[..., k] * fp, s, mode='wrap') for k in range(3)], -1)
        smooth = np.where(wgt[..., None] > 1e-5, smooth / np.maximum(wgt, 1e-9)[..., None], nearest)
        blend = np.clip((dist - 1.5) / 3.0, 0.0, 1.0)[..., None]
        T = (nearest * (1 - blend) + smooth * blend)[:, pad:pad + W].reshape(-1, 3)

        # Refine the texels until bilinear lookups at the hits give back the reference.
        idx, w = taps(x, y, W, H)
        sample = lambda T: sum(w[k][:, None] * T[idx[k]] for k in range(4))
        nw = sum(wk ** 2 for wk in w)
        best, bestT = np.abs(sample(T) - col).mean(), T.copy()
        for _ in range(60):
            res = (col - sample(T)) / nw[:, None]
            num, n = np.zeros_like(T), np.zeros(len(T))
            for k in range(4):
                np.add.at(num, idx[k], w[k][:, None] * res)
                np.add.at(n, idx[k], (w[k] > 1e-6).astype(float))
            T[n > 0] += num[n > 0] / n[n > 0][:, None]
            T = np.clip(T, 0, 255)
            e = np.abs(sample(T) - col).mean()
            if e < best:
                best, bestT = e, T.copy()
        T = np.clip(np.round(bestT), 0, 255)

        # Mobility: a pixel may flow only if what flowing brings in is no more different from it than
        # its own on-screen neighbours already are (otherwise it is a torn spot, e.g. disk seen as shadow).
        om = FLOW * np.power(np.maximum(rr, 2.5) / 3.0, -1.5)
        dev = np.zeros(len(rr))
        for f in np.linspace(0, 1, 9):
            i2, w2 = taps(x + om * (f - 0.5) / (2 * np.pi) * W, y, W, H)
            dev = np.maximum(dev, np.abs(sum(w2[k][:, None] * T[i2[k]] for k in range(4)).mean(1) - col.mean(1)))
        mob = np.clip(1.0 - (dev - var[sel] - 8.0) / 24.0, 0.0, 1.0)
        macc = np.zeros((H, W))
        np.add.at(macc, (iv, iu), mob)
        mtex = np.where(filled, macc / np.maximum(cnt, 1), 0.0)
        mob_t = wrap(mtex)[iy, ix][:, pad:pad + W]
        alpha = np.clip(1.0 - (dist[:, pad:pad + W] - 1.5) / 4.5, 0.0, 1.0) * mob_t

        rgba = np.concatenate([T.reshape(H, W, 3), (np.round(alpha * 15) * 17)[..., None]], -1).astype(np.uint8)
        path = os.path.join(ROOT, 'public', f'disk-{name}.webp')
        Image.fromarray(rgba, 'RGBA').save(path, lossless=True, quality=100, method=6, exact=True)
        print(f'{name}: {int(sel.sum())} px, mean error {best:.3f}, {os.path.getsize(path) // 1024} KB')


if __name__ == '__main__':
    main()
