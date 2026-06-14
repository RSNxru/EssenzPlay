// Skeleton mostrado mientras yt-dlp procesa la URL y extrae metadata.
function Bar({ className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded bg-elevated ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

export default function SkeletonLoader() {
  return (
    <div className="w-full">
      <Bar className="aspect-video w-full" />
      <div className="mt-4 space-y-3">
        <Bar className="h-6 w-3/4" />
        <Bar className="h-4 w-1/2" />
        <div className="flex gap-2 pt-2">
          <Bar className="h-9 w-28" />
          <Bar className="h-9 w-28" />
        </div>
      </div>
    </div>
  );
}
