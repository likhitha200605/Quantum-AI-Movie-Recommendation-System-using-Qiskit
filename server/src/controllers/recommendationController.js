import { computeRecommendations } from "../services/recommendationService.js";
import { cache } from "../utils/cache.js";

export async function recommendations(req, res) {
  try {
    const knobs = {
      noise: Number(req.query.noise || 0.02),
      entanglement: Number(req.query.entanglement || 0.5),
      exploration: Number(req.query.exploration || 0.35),
    };
    const userId = req.user?.id || "guest";
    const cacheKey = `reco:${userId}:${JSON.stringify(knobs)}`;
    if (cache.has(cacheKey)) return res.json(cache.get(cacheKey));
    const data = await computeRecommendations(req.user?.id, knobs);
    cache.set(cacheKey, data);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ message: "Failed to load recommendations", detail: err.message });
  }
}
