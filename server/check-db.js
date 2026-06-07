import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/quantumflix').then(async () => {
  const Watchlist = mongoose.model('Watchlist', new mongoose.Schema({
    user: mongoose.Schema.Types.ObjectId,
    movies: [mongoose.Schema.Types.Mixed]
  }));
  const watchlists = await Watchlist.find({}).lean();
  console.log(JSON.stringify(watchlists, null, 2));
  process.exit(0);
});
