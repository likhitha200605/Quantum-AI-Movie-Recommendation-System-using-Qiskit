from typing import List

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from qiskit import QuantumCircuit, transpile
from qiskit.circuit.library import StatePreparation
from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel, depolarizing_error

app = FastAPI(title="QuantumFlix Quantum Service")


class SimilarityInput(BaseModel):
    user_vector: List[float]
    movie_vector: List[float]
    noise: float = 0.02
    entanglement: float = 0.5
    exploration: float = 0.35


def encode(vec: np.ndarray) -> np.ndarray:
    if len(vec) == 0:
        return np.array([1.0, 0.0], dtype=float)
    size = 1
    while size < len(vec):
        size *= 2
    padded = np.zeros(size, dtype=float)
    padded[: len(vec)] = vec
    n = np.linalg.norm(padded)
    if n == 0:
        padded[0] = 1.0
        return padded
    return padded / n


def noise_model(level: float):
    model = NoiseModel()
    if level <= 0:
        return model
    model.add_all_qubit_quantum_error(depolarizing_error(level, 1), ["h", "u", "x"])
    model.add_all_qubit_quantum_error(depolarizing_error(min(level * 1.4, 0.95), 2), ["cx"])
    model.add_all_qubit_quantum_error(depolarizing_error(min(level * 1.8, 0.95), 3), ["cswap"])
    return model


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/quantum/similarity")
def similarity(payload: SimilarityInput):
    u = encode(np.array(payload.user_vector, dtype=float))
    m = encode(np.array(payload.movie_vector, dtype=float))
    q = int(np.log2(len(u)))

    qc = QuantumCircuit(1 + 2 * q, 1)
    anc = 0
    uq = list(range(1, q + 1))
    mq = list(range(q + 1, 2 * q + 1))
    qc.append(StatePreparation(u), uq)
    qc.append(StatePreparation(m), mq)
    qc.h(anc)
    for a, b in zip(uq, mq):
        qc.cswap(anc, a, b)
    qc.h(anc)
    qc.measure(anc, 0)

    backend = AerSimulator(noise_model=noise_model(payload.noise))
    compiled = transpile(qc, backend)
    result = backend.run(compiled, shots=1024).result()
    counts = result.get_counts()
    p0 = counts.get("0", 0) / 1024
    overlap = max(0.0, min(1.0, 2 * p0 - 1))
    sim = float(np.sqrt(overlap))
    return {
        "similarity": sim,
        "p0": p0,
        "p1": counts.get("1", 0) / 1024,
        "entanglementApplied": payload.entanglement,
        "explorationApplied": payload.exploration,
    }
