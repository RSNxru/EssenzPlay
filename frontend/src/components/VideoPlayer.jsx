import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Volume2, VolumeX, Maximize, FastForward, Settings, Check, Loader2,
} from "lucide-react";
import { getSponsorSegments } from "../api";

function fmt(t) {
  if (!t || isNaN(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const QUALITIES = [
  { id: "auto", label: "Auto (rápido)" },
  { id: "720p", label: "720p HD" },
  { id: "1080p", label: "1080p Full HD" },
  { id: "4k", label: "4K Ultra HD" },
];

export default function VideoPlayer({ media }) {
  const videoRef = useRef(null);
  const firstRender = useRef(true);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [segments, setSegments] = useState([]);
  const [skipToast, setSkipToast] = useState(null);
  const [quality, setQuality] = useState("auto");
  const [qMenu, setQMenu] = useState(false);
  const [buffering, setBuffering] = useState(false);

  // Auto = stream progresivo directo (rápido, 360p en YouTube).
  // HD = el backend mezcla video+audio al vuelo a la calidad pedida.
  const srcFor = (q) =>
    q === "auto"
      ? media.stream_url
      : `/api/stream?url=${encodeURIComponent(media.webpage_url)}&quality=${q}`;

  // Al cambiar de video: SponsorBlock + reset de calidad a Auto.
  useEffect(() => {
    if (!media?.id) return;
    getSponsorSegments(media.id).then(setSegments);
    setQuality("auto");
  }, [media?.id]);

  // Al cambiar de calidad (no en el montaje): recarga y reproduce.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const v = videoRef.current;
    if (v) {
      v.load();
      v.play().catch(() => {});
    }
  }, [quality]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setProgress(v.currentTime);
    const seg = segments.find((s) => v.currentTime >= s.start && v.currentTime < s.end - 0.3);
    if (seg) {
      v.currentTime = seg.end;
      setSkipToast(seg.category);
      setTimeout(() => setSkipToast(null), 1800);
    }
  }, [segments]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  };

  const currentLabel = QUALITIES.find((q) => q.id === quality)?.label || "Auto";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-white/5 bg-black shadow-neon"
    >
      <video
        ref={videoRef}
        src={srcFor(quality)}
        poster={media.thumbnail}
        className="h-full w-full"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
      />

      {/* Spinner de buffering (al cargar HD) */}
      {buffering && (
        <div className="absolute inset-0 grid place-items-center bg-black/30">
          <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm text-neon backdrop-blur">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando {currentLabel}…
          </div>
        </div>
      )}

      {/* Toast de "Saltado: sponsor" */}
      {skipToast && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-neon/20 px-3 py-1.5 text-xs font-medium text-neon backdrop-blur"
        >
          <FastForward className="h-3.5 w-3.5" /> Saltado: {skipToast}
        </motion.div>
      )}

      {/* Controles custom */}
      <div className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/90 to-transparent p-4 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
        {/* Barra de progreso con marcadores de sponsor */}
        <div
          className="relative mb-3 h-1.5 cursor-pointer rounded-full bg-white/15"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            videoRef.current.currentTime = ((e.clientX - r.left) / r.width) * duration;
          }}
        >
          <div className="absolute inset-y-0 left-0 rounded-full bg-neon" style={{ width: `${(progress / duration) * 100 || 0}%` }} />
          {segments.map((s, i) => (
            <div
              key={i}
              title={`SponsorBlock: ${s.category}`}
              className="absolute inset-y-0 bg-magenta/70"
              style={{ left: `${(s.start / duration) * 100}%`, width: `${((s.end - s.start) / duration) * 100}%` }}
            />
          ))}
        </div>

        <div className="flex items-center gap-4 text-gray-100">
          <button onClick={togglePlay} className="hover:text-neon">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button
            onClick={() => {
              videoRef.current.muted = !muted;
              setMuted(!muted);
            }}
            className="hover:text-neon"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <span className="font-mono text-xs text-muted">
            {fmt(progress)} / {fmt(duration)}
          </span>

          {/* Selector de calidad */}
          <div className="relative ml-auto">
            <button
              onClick={() => setQMenu((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs hover:text-neon"
            >
              <Settings className="h-4 w-4" />
              <span className="font-medium">{quality === "auto" ? "Auto" : quality.toUpperCase()}</span>
            </button>
            <AnimatePresence>
              {qMenu && (
                <motion.ul
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute bottom-9 right-0 w-44 overflow-hidden rounded-xl border border-white/10 bg-surface/95 p-1 shadow-xl backdrop-blur"
                >
                  {QUALITIES.map((q) => (
                    <li key={q.id}>
                      <button
                        onClick={() => {
                          setQuality(q.id);
                          setQMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-white/5"
                      >
                        <span className="flex-1">{q.label}</span>
                        {q.id === quality && <Check className="h-4 w-4 text-neon" />}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          <button onClick={() => videoRef.current.requestFullscreen()} className="hover:text-neon">
            <Maximize className="h-5 w-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
