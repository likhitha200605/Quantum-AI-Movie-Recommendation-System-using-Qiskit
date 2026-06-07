import mongoose from "mongoose";
import UserBehavior from "../models/UserBehavior.js";

function sanitizeSearchQuery(value = "") {
  return String(value).trim().toLowerCase().slice(0, 120);
}

async function addToBehaviorSet(userId, field, value) {
  await UserBehavior.findOneAndUpdate(
    { userId },
    { $addToSet: { [field]: value } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function trackWatchlist(req, res) {
  try {
    const { movieId } = req.body;
    if (!movieId || !mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(400).json({ message: "Valid movieId is required" });
    }

    await addToBehaviorSet(req.user.id, "watchlist", new mongoose.Types.ObjectId(movieId));
    return res.json({ message: "Watchlist behavior tracked" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to track watchlist behavior", detail: err.message });
  }
}

export async function trackTrailer(req, res) {
  try {
    const { movieId } = req.body;
    if (!movieId || !mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(400).json({ message: "Valid movieId is required" });
    }

    await addToBehaviorSet(req.user.id, "trailerClicks", new mongoose.Types.ObjectId(movieId));
    return res.json({ message: "Trailer click tracked" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to track trailer behavior", detail: err.message });
  }
}

export async function trackSearch(req, res) {
  try {
    const { query } = req.body;
    const cleanQuery = sanitizeSearchQuery(query);
    if (!cleanQuery) {
      return res.status(400).json({ message: "query is required" });
    }

    await addToBehaviorSet(req.user.id, "searchHistory", cleanQuery);
    return res.json({ message: "Search behavior tracked" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to track search behavior", detail: err.message });
  }
}
