export default function LoadingSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-white/10" />
      ))}
    </div>
  );
}
