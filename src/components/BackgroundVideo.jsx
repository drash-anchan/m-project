import { useEffect, useRef, useState } from "react";
import { BG_VIDEO_SOURCES, BG_VIDEO_POSTER } from "../siteConfig";

// Rotating-Earth background used behind every page (via PageShell).
//
// History:
// v1 shipped a .mov which most non-Safari browsers refused to decode,
// so the bg-black fallback was all anyone saw. That was fixed by
// shipping .mp4/.webm instead — but that left a second, separate bug:
// on first load the video (and therefore the Earth) stayed invisible
// until the user scrolled, at which point it suddenly appeared.
//
// Why that happens: a `position: fixed` element containing a <video>
// is a known trigger for mobile Safari/Chrome to skip painting the
// element into its own GPU compositing layer on initial load — the
// layer only gets created on the next scroll/repaint, so nothing
// shows up on screen even though the video is actually playing
// underneath. It's a compositor bug, not a video/decoding bug.
//
// Fix, two parts:
// 1. Force the browser to promote this element to its own GPU layer
//    immediately, before any scroll happens, via `translateZ(0)` +
//    `will-change: transform`. This is the standard fix for the
//    fixed+video paint bug.
// 2. Belt-and-braces: once the video reports it can actually play,
//    nudge layout with a 0px scroll so any browser that still needs a
//    repaint to notice the new layer gets one automatically instead
//    of waiting for the person to scroll by hand.
// 3. Stacking order: this layer used to sit at `-z-10`, which put it
//    behind the opaque `background: #000` that body/#root carried in
//    index.css — negative-z descendants paint before in-flow block
//    backgrounds, so the Earth was covered by a plain black rectangle
//    on every page. It now sits at `z-0` with the page content lifted
//    to `z-10` (see PageShell), so the ordering no longer depends on
//    negative-z painting rules at all. `pointer-events-none` keeps it
//    from intercepting clicks now that it's no longer behind everything.
export default function BackgroundVideo() {
  const videoRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const forceRepaint = () => {
      // Reading offsetHeight forces layout; the 0-distance scroll
      // forces a compositor repaint. Both are no-ops visually.
      // eslint-disable-next-line no-unused-expressions
      document.body.offsetHeight;
      window.scrollBy(0, 1);
      window.scrollBy(0, -1);
    };

    // Some mobile browsers only autoplay after an explicit play() call
    // even when muted+playsInline are set — this nudges it along and
    // marks the fallback state if the browser blocks it outright.
    const p = v.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => setFailed(true));
    }

    v.addEventListener("loadeddata", forceRepaint);
    v.addEventListener("playing", forceRepaint);
    // Also cover the case where the video was already cached/ready
    // before this effect ran.
    if (v.readyState >= 2) forceRepaint();

    return () => {
      v.removeEventListener("loadeddata", forceRepaint);
      v.removeEventListener("playing", forceRepaint);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden bg-space-gradient pointer-events-none"
      style={{
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        willChange: "transform",
      }}
    >
      {!failed && (
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          style={{ transform: "translateZ(0)", WebkitTransform: "translateZ(0)" }}
          poster={BG_VIDEO_POSTER}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onError={() => setFailed(true)}
        >
          {BG_VIDEO_SOURCES.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
      )}
      {/* Very light scrim — just enough to keep body text legible over the
          brightest part of the Earth, deliberately far too weak to hide it.
          Earlier versions used a solid bg-black/35 and then a heavy
          55%/60% gradient, both of which read as "the Earth is missing".
          The middle is fully transparent so the globe stays the focal
          point; the faint top/bottom tint sits behind the fixed header
          and the footer text only. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
    </div>
  );
}
