export default function ExplainabilityPanel({ item }) {
  return (
    <div className="glass rounded-2xl p-4">
      <h4 className="mb-2 font-semibold">AI Explainability Panel</h4>
      <p className="text-sm text-slate-300">{item?.explainability || "Because you like high-concept Sci-Fi and cerebral drama."}</p>
      <div className="mt-3 text-xs text-slate-400">
        Quantum Score: {item?.quantumScore?.toFixed?.(3) || "0.000"} | Classical Score: {item?.classicalScore?.toFixed?.(3) || "0.000"}
      </div>
    </div>
  );
}
