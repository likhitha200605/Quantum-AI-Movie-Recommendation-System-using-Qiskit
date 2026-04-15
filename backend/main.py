from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from data_processing import build_movie_genre_vector, build_user_preference_vector, get_all_genres
from database import Movie, Rating, User, get_db, init_db
from quantum_model import hadamard_feature_map, quantum_similarity
from recommendation_engine import generate_recommendations


app = FastAPI(title="Quantum AI Movie Recommendation System")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
init_db()


class LoginRequest(BaseModel):
    username: str
    password: str


class RatingRequest(BaseModel):
    user_id: int
    movie_id: int
    rating: float


@app.on_event("startup")
def startup_event():
    init_db()


@app.get("/")
def health_check():
    return {"status": "ok", "service": "quantum-movie-recommender"}


@app.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if user and user.password == payload.password:
        return {"message": "Login successful", "user_id": user.id}

    if user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    new_user = User(username=payload.username, password=payload.password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created and logged in", "user_id": new_user.id}


@app.post("/rate-movie")
def rate_movie(payload: RatingRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload.user_id).first()
    movie = db.query(Movie).filter(Movie.id == payload.movie_id).first()
    if not user or not movie:
        raise HTTPException(status_code=404, detail="User or movie not found")

    rating = db.query(Rating).filter(Rating.user_id == payload.user_id, Rating.movie_id == payload.movie_id).first()
    if rating:
        rating.rating = payload.rating
    else:
        db.add(Rating(user_id=payload.user_id, movie_id=payload.movie_id, rating=payload.rating))
    db.commit()
    return {"message": "Rating saved"}


@app.get("/recommendations/{user_id}")
def recommendations(user_id: int, noise: float = 0.0, exploration: float = 0.35, db: Session = Depends(get_db)):
    return generate_recommendations(db, user_id=user_id, noise_level=noise, exploration=exploration)


@app.get("/quantum-circuit/{user_id}")
def quantum_circuit(user_id: int, movie_id: Optional[int] = None, db: Session = Depends(get_db)):
    all_genres = get_all_genres(db)
    user_vector = build_user_preference_vector(db, user_id, all_genres)

    movie = db.query(Movie).filter(Movie.id == movie_id).first() if movie_id else db.query(Movie).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    movie_vector = build_movie_genre_vector(movie, all_genres)
    q_result = quantum_similarity(user_vector, movie_vector)
    hadamard_circuit, hadamard_qasm = hadamard_feature_map(min(4, len(all_genres) if all_genres else 2))

    return {
        "user_id": user_id,
        "movie_id": movie.id,
        "swap_test_qasm": q_result.qasm,
        "hadamard_qasm": hadamard_qasm,
        "measurement": {"p0": q_result.p_zero, "p1": q_result.p_one},
        "similarity": q_result.similarity,
        "hadamard_circuit_ascii": hadamard_circuit.draw(output="text").single_string(),
    }


@app.get("/analytics")
def analytics(user_id: int = 1, db: Session = Depends(get_db)):
    recs = generate_recommendations(db, user_id=user_id)
    return recs["analytics"]
