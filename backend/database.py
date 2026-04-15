import os
from pathlib import Path

import pandas as pd
from sqlalchemy import Column, Float, ForeignKey, Integer, String, create_engine
from sqlalchemy.orm import Session, declarative_base, relationship, sessionmaker


BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = BASE_DIR / "dataset"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'quantum_movies.db'}")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    ratings = relationship("Rating", back_populates="user")


class Movie(Base):
    __tablename__ = "movies"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    genres = Column(String)
    tags = Column(String)
    ratings = relationship("Rating", back_populates="movie")


class Rating(Base):
    __tablename__ = "ratings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    movie_id = Column(Integer, ForeignKey("movies.id"))
    rating = Column(Float)
    user = relationship("User", back_populates="ratings")
    movie = relationship("Movie", back_populates="ratings")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Movie).count() == 0:
            movies_df = pd.read_csv(DATASET_DIR / "movies.csv")
            for _, row in movies_df.iterrows():
                db.add(
                    Movie(
                        id=int(row["movie_id"]),
                        title=row["title"],
                        genres=row["genres"],
                        tags=row["tags"],
                    )
                )

        if db.query(User).count() == 0:
            seed_users = ["alice", "bob", "charlie", "diana", "ethan"]
            for idx, username in enumerate(seed_users, start=1):
                db.add(User(id=idx, username=username, password="quantum123"))

        if db.query(Rating).count() == 0:
            ratings_df = pd.read_csv(DATASET_DIR / "ratings.csv")
            for _, row in ratings_df.iterrows():
                db.add(
                    Rating(
                        user_id=int(row["user_id"]),
                        movie_id=int(row["movie_id"]),
                        rating=float(row["rating"]),
                    )
                )
        db.commit()
    finally:
        db.close()
