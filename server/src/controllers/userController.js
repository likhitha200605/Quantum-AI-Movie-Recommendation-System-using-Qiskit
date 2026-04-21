import User from "../models/User.js";
import Watchlist from "../models/Watchlist.js";

export async function me(req, res) {
  try {
    const user = await User.findById(req.user.id).select("-password");
    const watchlist = await Watchlist.findOne({ user: req.user.id }).populate("movies");
    return res.json({ user, watchlist: watchlist?.movies || [] });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load user profile", detail: err.message });
  }
}

export async function updateProfile(req, res) {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ message: "Name and email are required" });

    const exists = await User.findOne({ email, _id: { $ne: req.user.id } });
    if (exists) return res.status(409).json({ message: "Email already in use" });

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { name: name.trim(), email: email.trim().toLowerCase() },
      { new: true }
    ).select("-password");

    return res.json({ user: updated });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update profile", detail: err.message });
  }
}
