import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    avatarUrl: { type: String, default: "" },
    personalizationScore: { type: Number, default: 0.5 },
    favoriteGenres: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
