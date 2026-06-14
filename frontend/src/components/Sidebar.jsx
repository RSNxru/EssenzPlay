import { motion } from "framer-motion";
import { Clock, Download, Play } from "lucide-react";

export default function Sidebar({ history, onPick, view, setView, downloadCount }) {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-white/5 bg-surface/50 backdrop-blur">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-neon to-magenta" />
        <span className="font-mono text-lg font-bold tracking-tight">EssenzPlay</span>
      </div>

      {/* Navegación */}
      <nav className="flex gap-1 px-3">
        <TabBtn active={view === "player"} onClick={() => setView("player")} icon={Play} label="Reproductor" />
        <TabBtn active={view === "downloads"} onClick={() => setView("downloads")} icon={Download} label="Descargas" badge={downloadCount} />
      </nav>

      <div className="mt-5 flex items-center gap-2 px-5 text-xs font-medium uppercase tracking-wider text-muted">
        <Clock className="h-3.5 w-3.5" /> Historial
      </div>

      <div className="mt-2 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {history.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted">Aún no has reproducido nada.</p>
        )}
        {history.map((h) => (
          <motion.button
            key={h.id}
            whileHover={{ x: 3 }}
            onClick={() => onPick(h)}
            className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white/5"
          >
            <img
              src={h.thumbnail}
              alt=""
              className="h-10 w-16 shrink-0 rounded object-cover bg-elevated"
              onError={(e) => (e.target.style.visibility = "hidden")}
            />
            <span className="line-clamp-2 text-xs text-gray-300">{h.title}</span>
          </motion.button>
        ))}
      </div>
    </aside>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? "bg-neon/10 text-neon" : "text-muted hover:bg-white/5"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-magenta px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
