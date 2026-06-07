import { motion } from "framer-motion";

export default function ExplainabilityPanel({ item }) {
  const qScore = item?.quantumScore ?? 0.85;
  const cScore = item?.classicalScore ?? 0.72;

  const tags = [];
  if (item?.genres && item.genres[0]) {
    tags.push({ label: `${item.genres[0]} Fan`, icon: "🍿" });
  } else {
    tags.push({ label: "Sci-Fi Fan", icon: "🍿" });
  }
  const isDrama = item?.genres?.some(g => ["Drama", "Romance", "History"].includes(g));
  tags.push({ label: isDrama ? "Rich Plot" : "High Pacing", icon: isDrama ? "🎭" : "⏱️" });
  tags.push({ label: "Actor Match", icon: "✦" });

  return (
    <div className="bg-[#0c0e14]/80 backdrop-blur-[12px] border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
      {/* Decorative pulse glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
            Quantum Engine Insights
          </span>
          <span className="text-[10px] font-bold text-slate-400">ACTIVE</span>
        </div>

        {/* Explainability Text */}
        <p className="text-xs text-slate-300 leading-relaxed font-medium">
          {item?.explainability || "Because you like high-concept Sci-Fi and cerebral drama."}
        </p>

        {/* Micro-tags */}
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, idx) => (
            <span 
              key={idx} 
              className="flex items-center gap-1 bg-white/5 border border-white/10 text-[9px] px-2 py-0.5 rounded-full text-slate-200 font-semibold"
            >
              <span className="text-cyan-400">{tag.icon}</span> {tag.label}
            </span>
          ))}
        </div>

        {/* Micro-telemetry Visuals */}
        <div className="space-y-3 pt-2 border-t border-white/5">
          {/* Quantum Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-slate-300 flex items-center gap-1">✦ Quantum Match</span>
              <span className="text-cyan-400">{Math.round(qScore * 100)}%</span>
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${qScore * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400"
              />
            </div>
          </div>

          {/* Classical Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-slate-400 flex items-center gap-1">⚙️ Classical Match</span>
              <span className="text-slate-400">{Math.round(cScore * 100)}%</span>
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${cScore * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-slate-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
