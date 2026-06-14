import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Maximize, FastForward } from "lucide-react";
import { getSponsorSegments } from "../api";

function fmt(t) {
  if (!t || isNaN(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function VideoPlayer({ media }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [segments, setSegments] = useState([]);
  const [skipToast, setSkipToast] = useState(null);

  // Trae los segmentos de SponsorBlock cuando cambia el video
  useEffect(() => {
    if (!media?.id) return;
    getSponsorSegments(media.id).then(setSegments);
  }, [media?.id]);

  // Lógica de salto automático de segmentos patrocinados
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-white/5 bg-black shadow-neon"
    >
      <video
        ref={videoRef}
        src={media.stream_url}
        poster={media.thumbnail}
        className="h-full w-full"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

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
          <button onClick={() => videoRef.current.requestFullscreen()} className="ml-auto hover:text-neon">
            <Maximize className="h-5 w-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
