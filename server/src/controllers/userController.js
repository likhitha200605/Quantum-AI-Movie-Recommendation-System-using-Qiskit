import User from "../models/User.js";
import Watchlist from "../models/Watchlist.js";

export async function me(req, res) {
  const user = await User.findById(req.user.id).select("-password");
  const watchlist = await Watchlist.findOne({ user: req.user.id }).populate("movies");
  res.json({ user, watchlist: watchlist?.movies || [] });
}
