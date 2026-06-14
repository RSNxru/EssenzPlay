import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Loader2 } from "lucide-react";

export default function SearchBar({ onSearch, loading }) {
  const [value, setValue] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const q = value.trim();
    if (q && !loading) onSearch(q);
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={submit}
      className="relative w-full"
    >
      <div className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-surface/80 px-4 py-3 backdrop-blur transition-all focus-within:border-neon/40 focus-within:shadow-neon">
        <Search className="h-5 w-5 shrink-0 text-muted group-focus-within:text-neon" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Pega una URL o busca por palabras clave…"
          className="w-full bg-transparent text-sm text-gray-100 placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-neon/10 px-4 py-1.5 text-sm font-medium text-neon transition-colors hover:bg-neon/20 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
        </button>
      </div>
    </motion.form>
  );
}
