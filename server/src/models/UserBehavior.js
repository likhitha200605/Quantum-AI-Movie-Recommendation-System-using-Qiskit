import mongoose from "mongoose";

const UserBehaviorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    watchlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Movie" }],
    trailerClicks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Movie" }],
    searchHistory: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model("UserBehavior", UserBehaviorSchema);
