from collections import Counter
from time import perf_counter
from typing import Dict, List

from sqlalchemy.orm import Session

from data_processing import (
    build_movie_genre_vector,
    build_user_preference_vector,
    classical_similarity,
    get_all_genres,
    get_unrated_movies,
)
from database import Movie, Rating
from quantum_model import quantum_similarity, superposition_distribution


def _genre_distribution(movies: List[Movie]) -> Dict[str, int]:
    counter = Counter()
    for movie in movies:
        for genre in movie.genres.split("|"):
            counter[genre.strip()] += 1
    return dict(counter)


def generate_recommendations(
    db: Session,
    user_id: int,
    noise_level: float = 0.0,
    exploration: float = 0.35,
    limit: int = 8,
) -> Dict:
    all_genres = get_all_genres(db)
    user_vector = build_user_preference_vector(db, user_id, all_genres)
    candidate_movies = get_unrated_movies(db, user_id)

    if len(candidate_movies) == 0:
        candidate_movies = db.query(Movie).all()

    scored = []
    quantum_scores_by_movie = {}
    quantum_total_ms = 0.0
    classical_total_ms = 0.0

    for movie in candidate_movies:
        movie_vector = build_movie_genre_vector(movie, all_genres)

        c_start = perf_counter()
        classical_score = classical_similarity(user_vector, movie_vector)
        classical_total_ms += (perf_counter() - c_start) * 1000

        q_result = quantum_similarity(user_vector, movie_vector, noise_level=noise_level)
        quantum_total_ms += q_result.execution_ms
        quantum_scores_by_movie[movie.id] = q_result.similarity

        hybrid_score = (1 - exploration) * q_result.similarity + exploration * classical_score
        scored.append(
            {
                "movie_id": movie.id,
                "title": movie.title,
                "genres": movie.genres,
                "tags": movie.tags,
                "quantum_score": q_result.similarity,
                "classical_score": classical_score,
                "hybrid_score": hybrid_score,
                "measurement": {"p0": q_result.p_zero, "p1": q_result.p_one},
                "explainability": (
                    f"Swap-test overlap={q_result.similarity:.3f}, "
                    f"classical alignment={classical_score:.3f}, "
                    f"hybrid rank signal={hybrid_score:.3f}"
                ),
                "circuit_qasm": q_result.qasm,
            }
        )

    scored.sort(key=lambda x: x["hybrid_score"], reverse=True)
    top = scored[:limit]
    superposition = superposition_distribution(quantum_scores_by_movie)

    # Entangled preferences: pick closest users by classical profile overlap
    related_users = []
    users = [u[0] for u in db.query(Rating.user_id).distinct().all() if u[0] != user_id]
    for other in users:
        other_vec = build_user_preference_vector(db, other, all_genres)
        entanglement_score = classical_similarity(user_vector, other_vec)
        related_users.append({"user_id": other, "entanglement_score": entanglement_score})
    related_users.sort(key=lambda x: x["entanglement_score"], reverse=True)

    return {
        "recommendations": top,
        "superposition_states": [
            {"movie_id": m["movie_id"], "title": m["title"], "probability": superposition.get(m["movie_id"], 0.0)}
            for m in top
        ],
        "entangled_users": related_users[:3],
        "analytics": {
            "quantum_execution_ms": quantum_total_ms,
            "classical_execution_ms": classical_total_ms,
            "genre_distribution": _genre_distribution([db.query(Movie).filter(Movie.id == m["movie_id"]).first() for m in top]),
            "quantum_vs_classical_accuracy_proxy": {
                "quantum": sum([m["quantum_score"] for m in top]) / max(len(top), 1),
                "classical": sum([m["classical_score"] for m in top]) / max(len(top), 1),
            },
        },
    }
