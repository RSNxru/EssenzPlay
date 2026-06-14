import { motion } from "framer-motion";
import { Globe, Lock, ShieldAlert, AlertTriangle, EyeOff, Bot } from "lucide-react";

// Mapea el código de error de dominio del backend a un mensaje visual elegante
const MAP = {
  GEO_BLOCKED: { icon: Globe, title: "Bloqueado por región", tone: "text-amber-400" },
  AGE_RESTRICTED: { icon: ShieldAlert, title: "Restricción de edad", tone: "text-amber-400" },
  BOT_CHECK: { icon: Bot, title: "Verificación anti-bot", tone: "text-amber-400" },
  PRIVATE: { icon: Lock, title: "Contenido privado", tone: "text-red-400" },
  UNAVAILABLE: { icon: EyeOff, title: "No disponible", tone: "text-red-400" },
  GENERIC: { icon: AlertTriangle, title: "Algo salió mal", tone: "text-red-400" },
};

export default function ErrorState({ error }) {
  const cfg = MAP[error.code] || MAP.GENERIC;
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-white/5 bg-surface/60 text-center"
    >
      <Icon className={`h-12 w-12 ${cfg.tone}`} />
      <h3 className="text-lg font-semibold">{cfg.title}</h3>
      <p className="max-w-md text-sm text-muted">{error.message}</p>
      {error.detail && <p className="max-w-md text-xs text-muted/60">{error.detail}</p>}
    </motion.div>
  );
}
