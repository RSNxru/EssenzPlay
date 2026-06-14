import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Play, Pause, X, Headphones, Gauge, FastForward, SkipBack, SkipForward, ListMusic,
} from "lucide-react";
import { getSponsorSegments } from "../api";

function fmt(t) {
  if (!t || isNaN(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const SPEEDS = [1, 1.25, 1.5, 1.75, 2];

// Mini-reproductor de audio persistente con COLA de episodios. Sigue sonando
// aunque navegues, auto-avanza al terminar y salta segmentos de SponsorBlock.
export default function PodcastPlayer({ queue, index, onNext, onPrev, onClose }) {
  const media = queue[index];
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(media?.duration || 0);
  const [speed, setSpeed] = useState(1);
  const [segments, setSegments] = useState([]);
  const [skipToast, setSkipToast] = useState(null);
  const [showQueue, setShowQueue] = useState(false);

  // Al cambiar de episodio: trae SponsorBlock, fija velocidad y autoplay.
  useEffect(() => {
    if (media?.id) getSponsorSegments(media.id).then(setSegments);
    const a = audioRef.current;
    if (a) {
      a.playbackRate = speed;
      a.play().catch(() => {});
    }
  }, [media?.id]);

  const handleTime = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    setProgress(a.currentTime);
    const seg = segments.find((s) => a.currentTime >= s.start && a.currentTime < s.end - 0.3);
    if (seg) {
      a.currentTime = seg.end;
      setSkipToast(seg.category);
      setTimeout(() => setSkipToast(null), 1600);
    }
  }, [segments]);

  const toggle = () => {
    const a = audioRef.current;
    a.paused ? a.play() : a.pause();
  };

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    audioRef.current.playbackRate = next;
  };

  const hasNext = index < queue.length - 1;
  const hasPrev = index > 0;

  return (
    <motion.div
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 90, opacity: 0 }}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-surface/95 backdrop-blur-xl"
    >
      <audio
        ref={audioRef}
        src={media.audio_url || media.stream_url}
        onTimeUpdate={handleTime}
        onLoadedMetadata={(e) => setDuration(e.target.duration || media.duration || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => hasNext && onNext()}
      />

      {skipToast && (
        <div className="absolute -top-9 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-neon/20 px-3 py-1 text-xs text-neon">
          <FastForward className="h-3.5 w-3.5" /> Saltado: {skipToast}
        </div>
      )}

      {/* Panel de cola desplegable */}
      {showQueue && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-h-56 max-w-5xl overflow-y-auto border-b border-white/10 px-6 py-3"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
            Cola · {queue.length} episodio(s)
          </p>
          {queue.map((m, i) => (
            <div
              key={m.id + i}
              className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm ${
                i === index ? "bg-neon/10 text-neon" : "text-gray-300"
              }`}
            >
              <span className="w-5 text-center font-mono text-xs text-muted">{i + 1}</span>
              <span className="line-clamp-1 flex-1">{m.title}</span>
              {i === index && <Headphones className="h-3.5 w-3.5" />}
            </div>
          ))}
        </motion.div>
      )}

      <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
        {/* Cover + título */}
        <img
          src={media.thumbnail}
          alt=""
          className="h-12 w-12 shrink-0 rounded-lg object-cover bg-elevated"
          onError={(e) => (e.target.style.visibility = "hidden")}
        />
        <div className="hidden min-w-0 sm:block">
          <p className="flex items-center gap-1.5 text-xs text-neon">
            <Headphones className="h-3 w-3" /> Podcast · {index + 1}/{queue.length}
          </p>
          <p className="line-clamp-1 text-sm font-medium">{media.title}</p>
        </div>

        {/* Controles de transporte */}
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="shrink-0 text-muted hover:text-white disabled:opacity-30"
        >
          <SkipBack className="h-5 w-5" />
        </button>
        <button
          onClick={toggle}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-neon to-magenta text-black"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-0.5" />}
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="shrink-0 text-muted hover:text-white disabled:opacity-30"
        >
          <SkipForward className="h-5 w-5" />
        </button>

        {/* Barra de progreso */}
        <div className="flex flex-1 items-center gap-3">
          <span className="font-mono text-[11px] text-muted">{fmt(progress)}</span>
          <div
            className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/15"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              audioRef.current.currentTime = ((e.clientX - r.left) / r.width) * duration;
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-neon"
              style={{ width: `${(progress / duration) * 100 || 0}%` }}
            />
            {segments.map((s, i) => (
              <div
                key={i}
                className="absolute inset-y-0 bg-magenta/70"
                style={{ left: `${(s.start / duration) * 100}%`, width: `${((s.end - s.start) / duration) * 100}%` }}
              />
            ))}
          </div>
          <span className="font-mono text-[11px] text-muted">{fmt(duration)}</span>
        </div>

        {/* Cola */}
        <button
          onClick={() => setShowQueue((q) => !q)}
          title="Ver la cola"
          className={`relative shrink-0 rounded-lg border px-2.5 py-1.5 ${
            showQueue ? "border-neon/40 text-neon" : "border-white/10 text-gray-200 hover:border-neon/40"
          }`}
        >
          <ListMusic className="h-4 w-4" />
          {queue.length > 1 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-magenta px-1 text-[10px] font-bold text-white">
              {queue.length}
            </span>
          )}
        </button>

        {/* Velocidad */}
        <button
          onClick={cycleSpeed}
          title="Velocidad de reproducción"
          className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-mono text-gray-200 hover:border-neon/40"
        >
          <Gauge className="h-3.5 w-3.5 text-magenta" /> {speed}x
        </button>

        <button onClick={onClose} className="shrink-0 text-muted hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  );
}
