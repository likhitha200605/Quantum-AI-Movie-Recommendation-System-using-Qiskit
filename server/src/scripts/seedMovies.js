import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import Movie from "../models/Movie.js";

dotenv.config();

const seed = [
  {
    title: "Interstellar",
    year: 2014,
    genres: ["Sci-Fi", "Drama"],
    tags: ["space", "wormhole"],
    posterUrl: "https://image.tmdb.org/t/p/w500/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg",
    trailerUrl: "https://www.youtube.com/embed/zSWdZVtXT7E",
    description: "A team travels through a wormhole to save humanity.",
    cast: ["Matthew McConaughey", "Anne Hathaway"],
    featured: true,
    trendingScore: 95,
  },
  {
    title: "Inception",
    year: 2010,
    genres: ["Sci-Fi", "Thriller"],
    tags: ["dream", "mind"],
    posterUrl: "https://image.tmdb.org/t/p/w500/8IB2e4r4oVhHnANbnm7O3Tj6tF8.jpg",
    trailerUrl: "https://www.youtube.com/embed/YoHD9XEInc0",
    description: "A thief steals secrets through dream-sharing technology.",
    cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt"],
    trendingScore: 88,
  },
  {
    title: "The Matrix",
    year: 1999,
    genres: ["Sci-Fi", "Action"],
    tags: ["simulation", "ai"],
    posterUrl: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    trailerUrl: "https://www.youtube.com/embed/vKQi3bBA1y8",
    description: "A hacker discovers reality is a simulation.",
    cast: ["Keanu Reeves", "Carrie-Anne Moss"],
    trendingScore: 90,
  }
];

async function run() {
  await connectDB(process.env.MONGO_URI);
  await Movie.deleteMany({});
  await Movie.insertMany(seed);
  console.log("Seeded movies:", seed.length);
  process.exit(0);
}

run();
