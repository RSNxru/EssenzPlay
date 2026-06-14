import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2, Download } from "lucide-react";

const STATUS = {
  queued: { color: "text-muted", label: "En cola" },
  downloading: { color: "text-neon", label: "Descargando" },
  processing: { color: "text-magenta", label: "Procesando" },
  done: { color: "text-green-400", label: "Completado" },
  error: { color: "text-red-400", label: "Error" },
};

export default function Dashboard({ jobs }) {
  const list = Object.values(jobs);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h2 className="mb-6 flex items-center gap-2 text-xl font-bold">
        <Download className="h-5 w-5 text-neon" /> Descargas
      </h2>

      {list.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-muted">
          No hay descargas activas. Reproduce un video y pulsa «Descargar».
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence>
          {list.map((job) => {
            const st = STATUS[job.status] || STATUS.queued;
            return (
              <motion.div
                key={job.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-white/5 bg-surface/70 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="line-clamp-1 text-sm font-medium">
                    {job.title || job.url}
                  </span>
                  <span className={`flex items-center gap-1.5 text-xs ${st.color}`}>
                    {job.status === "done" && <CheckCircle2 className="h-4 w-4" />}
                    {job.status === "error" && <AlertCircle className="h-4 w-4" />}
                    {["downloading", "processing", "queued"].includes(job.status) && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {st.label}
                  </span>
                </div>

                {job.status !== "error" ? (
                  <>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-neon to-magenta"
                        animate={{ width: `${job.progress}%` }}
                        transition={{ ease: "linear" }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between font-mono text-[11px] text-muted">
                      <span>{job.progress.toFixed(0)}% · {job.format}</span>
                      <span>{job.speed} {job.eta && `· ETA ${job.eta}`}</span>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-red-400/80">{job.error}</p>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
