import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Headphones, ListPlus } from "lucide-react";

import SearchBar from "./components/SearchBar";
import VideoPlayer from "./components/VideoPlayer";
import FormatSelector from "./components/FormatSelector";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import SkeletonLoader from "./components/SkeletonLoader";
import ErrorState from "./components/ErrorState";
import PodcastPlayer from "./components/PodcastPlayer";

import { extract, getHistory, startDownload, streamDownload } from "./api";

export default function App() {
  const [view, setView] = useState("player");      // player | downloads
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [format, setFormat] = useState("1080p");
  const [history, setHistory] = useState([]);
  const [jobs, setJobs] = useState({});             // { jobId: DownloadStatus }
  const [queue, setQueue] = useState([]);           // cola de podcasts [media, ...]
  const [qIndex, setQIndex] = useState(0);          // episodio actual en la cola
  const [toast, setToast] = useState(null);

  useEffect(() => {
    getHistory().then(setHistory);
  }, []);

  // --- Cola de podcasts -----------------------------------------------------
  const playPodcast = (m) => {            // reproduce ahora (reemplaza la cola)
    setQueue([m]);
    setQIndex(0);
  };
  const enqueuePodcast = (m) => {         // añade al final de la cola
    setQueue((q) => (q.length ? [...q, m] : [m]));
    if (!queue.length) setQIndex(0);
    setToast(queue.length ? "Añadido a la cola" : "Reproduciendo");
    setTimeout(() => setToast(null), 1600);
  };
  const closePodcast = () => setQueue([]);
  const nextEp = () => setQIndex((i) => Math.min(i + 1, queue.length - 1));
  const prevEp = () => setQIndex((i) => Math.max(i - 1, 0));

  const handleSearch = async (query) => {
    setLoading(true);
    setError(null);
    setMedia(null);
    try {
      const info = await extract(query);
      setMedia(info);
      getHistory().then(setHistory);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!media) return;
    const job = await startDownload(media.webpage_url, format, media.title);
    setJobs((j) => ({ ...j, [job.id]: job }));
    setView("downloads");
    // Suscripción SSE: cada tick actualiza el job en el dashboard
    streamDownload(job.id, (update) =>
      setJobs((j) => ({ ...j, [update.id]: update }))
    );
  };

  const activeDownloads = Object.values(jobs).filter((j) =>
    ["queued", "downloading", "processing"].includes(j.status)
  ).length;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        history={history}
        onPick={(h) => {
          setView("player");
          handleSearch(h.webpage_url);
        }}
        view={view}
        setView={setView}
        downloadCount={activeDownloads}
      />

      <main className="flex-1 overflow-y-auto">
        <div className={`mx-auto max-w-5xl px-6 py-8 ${queue.length ? "pb-28" : ""}`}>
          {view === "player" ? (
            <>
              <SearchBar onSearch={handleSearch} loading={loading} />

              <div className="mt-8">
                {loading && <SkeletonLoader />}
                {!loading && error && <ErrorState error={error} />}
                {!loading && !error && media && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <VideoPlayer media={media} />
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h1 className="text-xl font-bold">{media.title}</h1>
                        <p className="text-sm text-muted">{media.uploader}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <FormatSelector value={format} onChange={setFormat} />
                        <button
                          onClick={() => playPodcast(media)}
                          title="Escuchar solo el audio en segundo plano"
                          className="flex items-center gap-2 rounded-xl border border-neon/30 px-4 py-2 text-sm font-medium text-neon transition-colors hover:bg-neon/10"
                        >
                          <Headphones className="h-4 w-4" /> Podcast
                        </button>
                        <button
                          onClick={() => enqueuePodcast(media)}
                          title="Añadir a la cola de podcasts"
                          className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-neon/30"
                        >
                          <ListPlus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleDownload}
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon to-magenta px-5 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                        >
                          <Download className="h-4 w-4" /> Descargar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
                {!loading && !error && !media && (
                  <div className="flex flex-col items-center justify-center py-24 text-center text-muted">
                    <div className="mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-neon/20 to-magenta/20" />
                    <p className="text-lg">Pega una URL o busca algo para empezar</p>
                    <p className="text-sm text-muted/60">Reproducción sin anuncios · SponsorBlock · Descargas 4K</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Dashboard jobs={jobs} />
          )}
        </div>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-neon/20 px-4 py-2 text-sm text-neon backdrop-blur"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {queue.length > 0 && (
          <PodcastPlayer
            queue={queue}
            index={qIndex}
            onNext={nextEp}
            onPrev={prevEp}
            onClose={closePodcast}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
