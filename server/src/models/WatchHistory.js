import mongoose from "mongoose";

const WatchHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: "Movie" },
    minutesWatched: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("WatchHistory", WatchHistorySchema);
