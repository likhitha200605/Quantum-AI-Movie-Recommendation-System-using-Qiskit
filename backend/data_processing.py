from collections import defaultdict
from typing import Dict, List, Tuple

import numpy as np
from sqlalchemy.orm import Session

from database import Movie, Rating


def normalize_vector(vector: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vector)
    if norm == 0:
        return vector
    return vector / norm


def get_all_genres(db: Session) -> List[str]:
    all_genres = set()
    for movie in db.query(Movie).all():
        for genre in movie.genres.split("|"):
            all_genres.add(genre.strip())
    return sorted(list(all_genres))


def build_user_preference_vector(db: Session, user_id: int, all_genres: List[str]) -> np.ndarray:
    genre_scores = defaultdict(float)
    genre_counts = defaultdict(float)

    ratings = db.query(Rating).filter(Rating.user_id == user_id).all()
    for rating in ratings:
        movie = db.query(Movie).filter(Movie.id == rating.movie_id).first()
        if not movie:
            continue
        for genre in movie.genres.split("|"):
            cleaned = genre.strip()
            genre_scores[cleaned] += rating.rating
            genre_counts[cleaned] += 1

    preference_vector = []
    for genre in all_genres:
        if genre_counts[genre] == 0:
            preference_vector.append(0.0)
        else:
            preference_vector.append(genre_scores[genre] / genre_counts[genre])

    return normalize_vector(np.array(preference_vector, dtype=float))


def build_movie_genre_vector(movie: Movie, all_genres: List[str]) -> np.ndarray:
    present = set(g.strip() for g in movie.genres.split("|"))
    vector = np.array([1.0 if genre in present else 0.0 for genre in all_genres], dtype=float)
    return normalize_vector(vector)


def get_unrated_movies(db: Session, user_id: int) -> List[Movie]:
    rated_ids = [r.movie_id for r in db.query(Rating).filter(Rating.user_id == user_id).all()]
    if not rated_ids:
        return db.query(Movie).all()
    return db.query(Movie).filter(~Movie.id.in_(rated_ids)).all()


def classical_similarity(user_vec: np.ndarray, movie_vec: np.ndarray) -> float:
    return float(np.dot(user_vec, movie_vec))


def user_similarity_matrix(db: Session, all_genres: List[str]) -> Dict[Tuple[int, int], float]:
    users = {r.user_id for r in db.query(Rating.user_id).distinct().all()}
    user_vectors = {uid: build_user_preference_vector(db, uid, all_genres) for uid in users}

    similarity_map: Dict[Tuple[int, int], float] = {}
    user_list = sorted(user_vectors.keys())
    for i, u1 in enumerate(user_list):
        for u2 in user_list[i + 1:]:
            sim = classical_similarity(user_vectors[u1], user_vectors[u2])
            similarity_map[(u1, u2)] = sim
            similarity_map[(u2, u1)] = sim
    return similarity_map
