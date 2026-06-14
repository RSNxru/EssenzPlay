import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Video, Music, Check } from "lucide-react";

// Presets rápidos + formatos crudos de yt-dlp
const PRESETS = [
  { id: "4k", label: "4K Ultra HD", icon: Video },
  { id: "1080p", label: "1080p Full HD", icon: Video },
  { id: "720p", label: "720p HD", icon: Video },
  { id: "audio", label: "Solo audio (MP3)", icon: Music },
];

export default function FormatSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const current = PRESETS.find((p) => p.id === value) || PRESETS[1];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-white/5 bg-elevated px-4 py-2 text-sm transition-colors hover:border-magenta/40"
      >
        <current.icon className="h-4 w-4 text-magenta" />
        <span>{current.label}</span>
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-20 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-surface/95 p-1 shadow-xl backdrop-blur"
          >
            {PRESETS.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-200 transition-colors hover:bg-white/5"
                >
                  <p.icon className="h-4 w-4 text-muted" />
                  <span className="flex-1 text-left">{p.label}</span>
                  {p.id === value && <Check className="h-4 w-4 text-neon" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
