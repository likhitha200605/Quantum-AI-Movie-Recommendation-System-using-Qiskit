import mongoose from "mongoose";

const WatchlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
    movies: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model("Watchlist", WatchlistSchema);
