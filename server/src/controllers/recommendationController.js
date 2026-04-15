import { computeRecommendations } from "../services/recommendationService.js";
import { cache } from "../utils/cache.js";

export async function recommendations(req, res) {
  const knobs = {
    noise: Number(req.query.noise || 0.02),
    entanglement: Number(req.query.entanglement || 0.5),
    exploration: Number(req.query.exploration || 0.35),
  };
  const cacheKey = `reco:${req.user.id}:${JSON.stringify(knobs)}`;
  if (cache.has(cacheKey)) return res.json(cache.get(cacheKey));
  const data = await computeRecommendations(req.user.id, knobs);
  cache.set(cacheKey, data);
  res.json(data);
}
