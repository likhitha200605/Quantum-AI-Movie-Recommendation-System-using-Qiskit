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
  },
  {
    title: "Blade Runner 2049",
    year: 2017,
    genres: ["Sci-Fi", "Mystery"],
    tags: ["ai", "future"],
    posterUrl: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    trailerUrl: "https://www.youtube.com/embed/gCcx85zbxz4",
    description: "A young blade runner uncovers a secret tied to humanity.",
    cast: ["Ryan Gosling", "Harrison Ford"],
    trendingScore: 84,
  },
  {
    title: "Arrival",
    year: 2016,
    genres: ["Sci-Fi", "Drama"],
    tags: ["linguistics", "aliens"],
    posterUrl: "https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg",
    trailerUrl: "https://www.youtube.com/embed/tFMo3UJ4B4g",
    description: "A linguist works to communicate with visitors from beyond Earth.",
    cast: ["Amy Adams", "Jeremy Renner"],
    trendingScore: 82,
  },
  {
    title: "Dune",
    year: 2021,
    genres: ["Sci-Fi", "Adventure"],
    tags: ["desert", "prophecy"],
    posterUrl: "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
    trailerUrl: "https://www.youtube.com/embed/8g18jFHCLXk",
    description: "A noble family is drawn into a war over a rare and powerful resource.",
    cast: ["Timothee Chalamet", "Zendaya"],
    trendingScore: 92,
  },
  {
    title: "Tenet",
    year: 2020,
    genres: ["Sci-Fi", "Action"],
    tags: ["time", "espionage"],
    posterUrl: "https://image.tmdb.org/t/p/w500/k68nPLbIST6NP96JmTxmZijEvCA.jpg",
    trailerUrl: "https://www.youtube.com/embed/LdOM0x0XDMo",
    description: "A secret agent manipulates time to stop global catastrophe.",
    cast: ["John David Washington", "Robert Pattinson"],
    trendingScore: 80,
  },
  {
    title: "Ex Machina",
    year: 2014,
    genres: ["Sci-Fi", "Thriller"],
    tags: ["ai", "ethics"],
    posterUrl: "https://image.tmdb.org/t/p/w500/dmJW8IAKHKxFNiUnoDR7JfsK7Rp.jpg",
    trailerUrl: "https://www.youtube.com/embed/EoQuVnKhxaM",
    description: "A programmer evaluates the consciousness of an advanced AI.",
    cast: ["Alicia Vikander", "Domhnall Gleeson"],
    trendingScore: 78,
  },
];

async function run() {
  await connectDB(process.env.MONGO_URI);
  await Movie.deleteMany({});
  await Movie.insertMany(seed);
  console.log("Seeded movies:", seed.length);
  process.exit(0);
}

run();
