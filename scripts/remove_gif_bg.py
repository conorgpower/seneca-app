#!/usr/bin/env python3
"""
remove_gif_bg.py
================
Removes the background from every animated GIF found inside assets/mascot/
(searched recursively) and saves a new *_nobg.gif file next to each original.

Two modes are available:

  color  – (default) Detects the dominant background colour from frame corners
           and removes pixels within a configurable colour distance. This is
           deterministic, consistent across frames, and preserves non-background
           elements like thought bubbles.

  ai     – Uses rembg (AI-based, U2Net model) for segmentation. Better for
           photos / complex backgrounds but may incorrectly remove foreground
           elements and can be inconsistent between frames.

Requirements (install once):
    pip3 install Pillow numpy             # for color mode
    pip3 install "rembg[cpu]"             # additionally needed for ai mode

Usage:
    # From the project root (color mode, default):
    python3 scripts/remove_gif_bg.py assets/mascot/thinking-animated.gif

    # Adjust colour tolerance (higher = more aggressive removal, default 40):
    python3 scripts/remove_gif_bg.py --color-tolerance 50 assets/mascot/thinking-animated.gif

    # Use AI mode:
    python3 scripts/remove_gif_bg.py --mode ai assets/mascot/thinking-animated.gif

    # Preview what would be processed without doing any work:
    python3 scripts/remove_gif_bg.py --dry-run
"""

import argparse
import io
import sys
from pathlib import Path

# ── Dependency checks ─────────────────────────────────────────────────────────

try:
    import numpy as np
except ImportError:
    print("❌  numpy not found.  Run: pip3 install numpy")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("❌  Pillow not found.  Run: pip3 install Pillow")
    sys.exit(1)

def _load_rembg():
    """Lazy-load rembg so color mode doesn't require it."""
    try:
        from rembg import new_session, remove as rembg_remove
        return new_session, rembg_remove
    except ImportError:
        print('❌  rembg not found.  Run: pip3 install "rembg[cpu]"')
        sys.exit(1)
    except Exception as e:
        if "onnxruntime" in str(e).lower() or "backend" in str(e).lower():
            print('❌  ONNX Runtime backend missing.  Run: pip3 install "rembg[cpu]"')
            sys.exit(1)
        raise

# ── Config ────────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent
MASCOT_DIR = SCRIPT_DIR.parent / "assets" / "mascot"

# ── Frame extraction ──────────────────────────────────────────────────────────

def extract_frames(gif_path: Path) -> tuple[list[Image.Image], list[int], int]:
    """
    Extract every frame from an animated GIF.
    Returns (frames_as_RGBA, per_frame_duration_ms, loop_count).
    """
    gif = Image.open(gif_path)
    frames: list[Image.Image] = []
    durations: list[int] = []

    try:
        while True:
            frames.append(gif.convert("RGBA").copy())
            durations.append(gif.info.get("duration", 100))
            gif.seek(gif.tell() + 1)
    except EOFError:
        pass

    loop = gif.info.get("loop", 0)
    return frames, durations, loop


# ── Colour-based background detection & removal ──────────────────────────────

def detect_bg_color(frame: Image.Image, sample_size: int = 20) -> np.ndarray:
    """
    Detect the dominant background colour by sampling corners of the frame.
    Returns an RGB numpy array [R, G, B].
    """
    rgb = np.array(frame.convert("RGB"), dtype=np.float64)
    h, w = rgb.shape[:2]
    s = min(sample_size, h // 4, w // 4)

    # Sample from all four corners
    corners = [
        rgb[:s, :s],          # top-left
        rgb[:s, w - s:],      # top-right
        rgb[h - s:, :s],      # bottom-left
        rgb[h - s:, w - s:],  # bottom-right
    ]
    all_pixels = np.concatenate([c.reshape(-1, 3) for c in corners], axis=0)
    return np.median(all_pixels, axis=0).astype(np.uint8)


def _flood_fill_from_edges(candidate: np.ndarray) -> np.ndarray:
    """
    Given a boolean 2-D array `candidate`, return a boolean mask that is True
    only for candidate pixels that are reachable from the image border via
    4-connected traversal through other candidate pixels.
    """
    from collections import deque

    h, w = candidate.shape
    visited = np.zeros_like(candidate)

    # Seed the queue with all border candidate pixels
    queue = deque()
    for y in range(h):
        for x in (0, w - 1):
            if candidate[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((y, x))
    for x in range(w):
        for y in (0, h - 1):
            if candidate[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((y, x))

    # BFS
    while queue:
        cy, cx = queue.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and candidate[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

    return visited


def _flood_fill(candidate: np.ndarray, seeds: np.ndarray) -> np.ndarray:
    """
    Flood-fill through True pixels in `candidate` starting from True pixels
    in `seeds`.  Returns a boolean mask of all reachable candidate pixels.
    """
    from collections import deque

    h, w = candidate.shape
    visited = seeds.copy() & candidate

    queue = deque(zip(*np.where(visited)))

    while queue:
        cy, cx = queue.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and candidate[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

    return visited


def _dilate_mask(mask: np.ndarray, iterations: int) -> np.ndarray:
    """Binary dilation using numpy only (3x3 cross kernel)."""
    out = mask.copy()
    for _ in range(iterations):
        dilated = np.zeros_like(out)
        dilated[1:, :] |= out[:-1, :]   # shift down
        dilated[:-1, :] |= out[1:, :]   # shift up
        dilated[:, 1:] |= out[:, :-1]   # shift right
        dilated[:, :-1] |= out[:, 1:]   # shift left
        dilated |= out                    # center
        out = dilated
    return out


def remove_bg_color(
    frame: Image.Image,
    bg_color: np.ndarray,
    tolerance: int,
    halo_pixels: int = 2,
    remove_interior: bool = True,
) -> Image.Image:
    """
    Remove background pixels that are connected to the image edges via
    flood-fill.  When `remove_interior` is True (default), additional
    background layers hidden behind the subject outline are iteratively
    detected and removed ("layer peeling").

    After flood-fill, the transparent region is expanded by `halo_pixels`
    to eat into anti-aliased edge halos.
    """
    rgb_arr = np.array(frame.convert("RGB"), dtype=np.float64)
    h, w = rgb_arr.shape[:2]
    dist = np.sqrt(np.sum((rgb_arr - bg_color.astype(np.float64)) ** 2, axis=2))

    # Mask of pixels that *could* be background (close to bg colour)
    bg_candidate = dist <= tolerance

    # Only remove candidate pixels reachable from the image border
    bg_mask = _flood_fill_from_edges(bg_candidate)

    # ── Interior removal ────────────────────────────────────────────────
    # When enabled, also remove bg-coloured pixels enclosed by subject
    # outlines (not reachable from edges).  Without this, regions like the
    # fill inside a lock icon would be preserved by the flood-fill.
    if remove_interior:
        bg_mask |= bg_candidate

    # Expand the transparent region by a few pixels to remove the anti-alias halo
    if halo_pixels > 0:
        bg_mask = _dilate_mask(bg_mask, iterations=halo_pixels)

    alpha = np.where(bg_mask, 0, 255).astype(np.uint8)

    rgba = np.array(frame.convert("RGBA"), dtype=np.uint8)
    rgba[:, :, 3] = alpha
    return Image.fromarray(rgba, "RGBA")


# ── AI-based per-frame background removal ────────────────────────────────────

def remove_bg_from_frame(frame: Image.Image, session, rembg_remove, threshold: int) -> Image.Image:
    """
    Run rembg on one RGBA frame, then binarise the alpha channel.
    Binarising is required because GIF can only store 1-bit transparency
    (a single palette entry is either fully transparent or fully opaque).
    """
    buf = io.BytesIO()
    frame.save(buf, format="PNG")

    result_bytes = rembg_remove(buf.getvalue(), session=session)
    result = Image.open(io.BytesIO(result_bytes)).convert("RGBA")

    # Binarise alpha: pixels at or above threshold → opaque; below → transparent
    r, g, b, a = result.split()
    a_arr = np.array(a, dtype=np.uint8)
    a_arr = np.where(a_arr >= threshold, 255, 0).astype(np.uint8)
    return Image.merge("RGBA", (r, g, b, Image.fromarray(a_arr, mode="L")))


# ── RGBA → GIF-compatible paletted frame ─────────────────────────────────────

def rgba_to_gif_frame(frame_rgba: Image.Image) -> tuple[Image.Image, int]:
    """
    Convert an RGBA image to a paletted (P-mode) image usable in a GIF,
    with transparent pixels mapped to palette index 255.

    Returns (paletted_image, transparent_palette_index).
    """
    alpha_arr = np.array(frame_rgba.getchannel("A"), dtype=np.uint8)
    opaque_mask = alpha_arr > 0

    # Quantise the visible pixels; fill invisible pixels with a neutral grey
    # first so they don't skew the colour palette.
    rgb_arr = np.array(frame_rgba.convert("RGB"), dtype=np.uint8)
    rgb_arr[~opaque_mask] = [128, 128, 128]

    quantised = Image.fromarray(rgb_arr).quantize(
        colors=255,
        method=Image.Quantize.FASTOCTREE,
    )
    palette = quantised.getpalette()  # 768 ints: [R0,G0,B0, R1,G1,B1, ...]

    transparent_index = 255  # palette index 255 is reserved as the transparent slot

    # Map every transparent pixel to the transparent index
    q_arr = np.array(quantised, dtype=np.uint8)
    q_arr[~opaque_mask] = transparent_index

    result = Image.fromarray(q_arr, mode="P")
    result.putpalette(palette)
    return result, transparent_index


# ── GIF assembly & save ───────────────────────────────────────────────────────

def process_gif(
    gif_path: Path,
    mode: str,
    session,
    rembg_remove_fn,
    threshold: int,
    color_tolerance: int,
    remove_interior: bool,
    dry_run: bool,
) -> None:
    out_path = gif_path.with_stem(gif_path.stem + "_nobg")

    print(f"📂  {gif_path.resolve().relative_to(MASCOT_DIR.parent)}")
    if dry_run:
        print(f"    → {out_path.name}  (dry-run, skipped)\n")
        return

    frames_rgba, durations, loop = extract_frames(gif_path)
    total = len(frames_rgba)
    print(f"    Frames : {total}  |  Output: {out_path.name}")

    if mode == "color":
        print(f"    Tolerance: {color_tolerance}  |  Per-frame BG detection + interior peeling")

    gif_frames: list[tuple[Image.Image, int, int]] = []

    for i, frame_rgba in enumerate(frames_rgba):
        print(f"    Processing frame {i + 1}/{total}…", end="\r", flush=True)
        if mode == "color":
            bg_color = detect_bg_color(frame_rgba)
            nobg = remove_bg_color(frame_rgba, bg_color, color_tolerance, remove_interior=remove_interior)
        else:
            nobg = remove_bg_from_frame(frame_rgba, session, rembg_remove_fn, threshold)
        paletted, ti = rgba_to_gif_frame(nobg)
        paletted.info["transparency"] = ti
        gif_frames.append((paletted, durations[i], ti))

    print(f"    Processing frame {total}/{total}… done       ")

    first_img, first_dur, first_ti = gif_frames[0]
    rest_imgs = [img for img, _, _ in gif_frames[1:]]

    first_img.save(
        out_path,
        format="GIF",
        save_all=True,
        append_images=rest_imgs,
        duration=durations,      # list of per-frame durations
        loop=loop,
        transparency=first_ti,
        disposal=2,              # "restore to background" prevents ghosting between frames
        optimize=False,
    )

    size_in  = gif_path.stat().st_size / 1024
    size_out = out_path.stat().st_size / 1024
    print(f"    ✅  Saved → {out_path.name}  ({size_in:.0f} KB → {size_out:.0f} KB)\n")


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Remove backgrounds from GIFs in assets/mascot/ using AI segmentation."
    )
    parser.add_argument(
        "input",
        nargs="?",
        type=Path,
        default=None,
        help="Single GIF file to process. If omitted, processes all GIFs in --mascot-dir.",
    )
    parser.add_argument(
        "--mascot-dir",
        type=Path,
        default=MASCOT_DIR,
        help=f"Folder to search recursively for GIFs (default: {MASCOT_DIR})",
    )
    parser.add_argument(
        "--mode",
        choices=["color", "ai"],
        default="color",
        help="Removal mode: 'color' (default) uses colour-distance matching; 'ai' uses rembg U2Net.",
    )
    parser.add_argument(
        "--color-tolerance",
        type=int,
        default=40,
        metavar="0-255",
        help=(
            "(color mode) Euclidean RGB distance threshold. Pixels within this distance "
            "of the detected background colour are removed. Higher = more aggressive. (default: 40)"
        ),
    )
    parser.add_argument(
        "--alpha-threshold",
        type=int,
        default=128,
        metavar="0-255",
        help=(
            "(ai mode) Alpha cutoff for binarisation. Pixels with alpha ≥ threshold are kept opaque; "
            "below are transparent. Lower = preserve more edge detail. (default: 128)"
        ),
    )
    parser.add_argument(
        "--no-interior",
        action="store_true",
        help=(
            "(color mode) Disable iterative removal of interior background layers. "
            "By default, after removing the outer background, additional uniform-colour "
            "regions behind the subject are peeled away automatically."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List files that would be processed without doing any work.",
    )
    args = parser.parse_args()

    if args.input:
        if not args.input.exists():
            print(f"File not found: {args.input}")
            sys.exit(1)
        gif_paths = [args.input]
        print(f"Processing 1 GIF: {args.input}\n")
    else:
        gif_paths = sorted(args.mascot_dir.rglob("*.gif"))
        gif_paths = [p for p in gif_paths if not p.stem.endswith("_nobg")]
        if not gif_paths:
            print(f"No GIF files found in {args.mascot_dir}")
            sys.exit(0)
        print(f"Found {len(gif_paths)} GIF(s) in {args.mascot_dir}\n")

    session = None
    rembg_remove_fn = None

    if not args.dry_run and args.mode == "ai":
        new_session, rembg_remove_fn = _load_rembg()
        print("Loading rembg model (downloads ~170 MB on first run, cached after that)…")
        session = new_session("u2net")
        print("Model ready.\n")
    elif not args.dry_run:
        print(f"Using color-based removal (tolerance={args.color_tolerance}).\n")

    for gif_path in gif_paths:
        process_gif(
            gif_path,
            mode=args.mode,
            session=session,
            rembg_remove_fn=rembg_remove_fn,
            threshold=args.alpha_threshold,
            color_tolerance=args.color_tolerance,
            remove_interior=not args.no_interior,
            dry_run=args.dry_run,
        )

    print("Done.")


if __name__ == "__main__":
    main()
