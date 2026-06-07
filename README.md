# QuantumFlix - Production-Grade Quantum AI Recommender

Netflix-style startup product with:
- React + Tailwind + Framer Motion frontend
- Node.js + Express + MongoDB backend
- FastAPI + Qiskit quantum microservice

## 1) Full Folder Structure

```text
quantam movie recommendation system/
├─ client/                         # React + Tailwind + Framer Motion
│  ├─ src/
│  │  ├─ components/
│  │  │  ├─ Navbar.jsx
│  │  │  ├─ MovieCard.jsx
│  │  │  ├─ LoadingSkeleton.jsx
│  │  │  ├─ ExplainabilityPanel.jsx
│  │  │  └─ QuantumComparisonChart.jsx
│  │  ├─ context/AuthContext.jsx
│  │  ├─ pages/
│  │  │  ├─ HomePage.jsx
│  │  │  ├─ MoviesPage.jsx
│  │  │  ├─ RecommendationsPage.jsx
│  │  │  ├─ QuantumLabPage.jsx
│  │  │  ├─ DashboardPage.jsx
│  │  │  ├─ MovieDetailsPage.jsx
│  │  │  └─ ProfilePage.jsx
│  │  ├─ services/api.js
│  │  ├─ App.jsx
│  │  └─ main.jsx
│  ├─ package.json
│  └─ tailwind.config.js
├─ server/                         # Node + Express + MongoDB
│  ├─ src/
│  │  ├─ config/db.js
│  │  ├─ controllers/
│  │  ├─ middleware/auth.js
│  │  ├─ models/
│  │  │  ├─ User.js
│  │  │  ├─ Movie.js
│  │  │  ├─ Rating.js
│  │  │  ├─ Watchlist.js
│  │  │  └─ WatchHistory.js
│  │  ├─ routes/
│  │  ├─ services/
│  │  │  ├─ recommendationService.js
│  │  │  └─ quantumService.js
│  │  ├─ scripts/seedMovies.js
│  │  ├─ app.js
│  │  └─ server.js
│  ├─ .env.example
│  └─ package.json
├─ quantum-service/                # FastAPI + Qiskit
│  ├─ main.py
│  └─ requirements.txt
└─ dataset/
```

## 2) Frontend Highlights (React)

- Modern responsive navbar:
  - Logo: `QuantumFlix`
  - Menu: Home, Movies, Recommendations, Quantum Lab, Dashboard, Profile
  - Search with autocomplete
  - Dark/light mode
  - Avatar dropdown with login/profile/logout
- Netflix-style homepage:
  - Hero banner
  - Trending cards
  - Motion animations with Framer Motion
- Movie details:
  - Poster, trailer embed, cast, rating, description
  - Watchlist button
  - Explainability panel
- Dashboard:
  - Watch stats
  - Personalization score
  - Genre chart (Chart.js)
- Quantum Lab:
  - Noise / Entanglement / Exploration sliders
  - Run button + quantum/classical comparison graph
- Performance:
  - lazy-loaded pages
  - loading skeletons

## 3) Backend Highlights (Node + Express)

- JWT auth with bcrypt hashing
- Movie APIs:
  - list/details/search suggestions
  - rating system
  - watchlist toggle
- Recommendation API:
  - hybrid classical + quantum scoring
  - explainable recommendation output
- Dashboard API:
  - watch time, genre distribution, personalization score
- Caching:
  - response-level caching with `node-cache`

## 4) MongoDB Schema (Core)

- `User`: name, email, password hash, personalizationScore, favoriteGenres
- `Movie`: title, year, genres, tags, poster/trailer, cast, trendingScore
- `Rating`: user, movie, score (1-5), unique user+movie
- `Watchlist`: user, movies[]
- `WatchHistory`: user, movie, minutesWatched

## 5) Setup Steps (Step-by-Step)

### A. Start MongoDB
Run local MongoDB on:
`mongodb://127.0.0.1:27017/quantumflix`

### B. Start Quantum Microservice
```bash
cd quantum-service
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8001
```

### C. Start Node Backend
```bash
cd server
cp .env.example .env
npm install
npm run seed
npm run dev
```
Server: `http://127.0.0.1:5000`

### D. Start React Frontend
```bash
cd client
npm install
npm run dev
```
Client: `http://127.0.0.1:5173`

Set optional frontend env:
`VITE_API_URL=http://127.0.0.1:5000/api`

## Key Startup-Level Features Delivered

- AI Explainability Panel
- Quantum vs Classical Comparison Graph
- User Personalization Score
- Loading skeletons
- Real-world modular architecture suitable for scaling
