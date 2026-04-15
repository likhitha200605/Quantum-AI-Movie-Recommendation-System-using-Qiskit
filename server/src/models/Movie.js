import mongoose from "mongoose";

const MovieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, index: true },
    year: Number,
    genres: [{ type: String, index: true }],
    tags: [{ type: String }],
    posterUrl: String,
    trailerUrl: String,
    description: String,
    cast: [{ type: String }],
    ratingAvg: { type: Number, default: 0 },
    watchTimeMinutes: { type: Number, default: 120 },
    featured: { type: Boolean, default: false },
    trendingScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

MovieSchema.index({ title: "text", tags: "text", genres: "text" });

export default mongoose.model("Movie", MovieSchema);
