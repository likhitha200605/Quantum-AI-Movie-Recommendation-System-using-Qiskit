import mongoose from "mongoose";

const RatingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    movie: { type: String, required: true, index: true },
    score: { type: Number, min: 1, max: 5, required: true },
    source: { type: String, default: "user" },
  },
  { timestamps: true }
);

RatingSchema.index({ user: 1, movie: 1 }, { unique: true });

export default mongoose.model("Rating", RatingSchema);
