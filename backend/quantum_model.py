from dataclasses import dataclass
from time import perf_counter
from typing import Dict, Tuple

import numpy as np
from qiskit import QuantumCircuit, qasm2, transpile
from qiskit.circuit.library import StatePreparation
from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel, depolarizing_error


@dataclass
class QuantumSimilarityResult:
    similarity: float
    p_zero: float
    p_one: float
    execution_ms: float
    qasm: str


def _next_power_of_two(n: int) -> int:
    power = 1
    while power < n:
        power *= 2
    return power


def amplitude_encode(vector: np.ndarray) -> np.ndarray:
    if len(vector) == 0:
        return np.array([1.0, 0.0], dtype=float)
    size = _next_power_of_two(len(vector))
    padded = np.zeros(size, dtype=float)
    padded[: len(vector)] = vector
    norm = np.linalg.norm(padded)
    if norm == 0:
        padded[0] = 1.0
        return padded
    return padded / norm


def _noise_model(noise_level: float) -> NoiseModel:
    model = NoiseModel()
    if noise_level <= 0:
        return model
    single_qubit_error = depolarizing_error(noise_level, 1)
    two_qubit_error = depolarizing_error(min(noise_level * 1.5, 0.95), 2)
    three_qubit_error = depolarizing_error(min(noise_level * 1.8, 0.95), 3)
    model.add_all_qubit_quantum_error(single_qubit_error, ["h", "x", "u"])
    model.add_all_qubit_quantum_error(two_qubit_error, ["cx"])
    model.add_all_qubit_quantum_error(three_qubit_error, ["cswap"])
    return model


def build_swap_test_circuit(user_state: np.ndarray, movie_state: np.ndarray) -> QuantumCircuit:
    qubits_per_state = int(np.log2(len(user_state)))
    qc = QuantumCircuit(1 + 2 * qubits_per_state, 1)
    ancilla = 0
    user_qubits = list(range(1, 1 + qubits_per_state))
    movie_qubits = list(range(1 + qubits_per_state, 1 + (2 * qubits_per_state)))

    qc.append(StatePreparation(user_state), user_qubits)
    qc.append(StatePreparation(movie_state), movie_qubits)

    qc.h(ancilla)
    for uq, mq in zip(user_qubits, movie_qubits):
        qc.cswap(ancilla, uq, mq)
    qc.h(ancilla)
    qc.measure(ancilla, 0)
    return qc


def quantum_similarity(user_vector: np.ndarray, movie_vector: np.ndarray, noise_level: float = 0.0, shots: int = 2048) -> QuantumSimilarityResult:
    user_state = amplitude_encode(user_vector)
    movie_state = amplitude_encode(movie_vector)
    swap_circuit = build_swap_test_circuit(user_state, movie_state)

    backend = AerSimulator(noise_model=_noise_model(noise_level))
    compiled = transpile(swap_circuit, backend)
    start = perf_counter()
    result = backend.run(compiled, shots=shots).result()
    elapsed = (perf_counter() - start) * 1000

    counts: Dict[str, int] = result.get_counts()
    p_zero = counts.get("0", 0) / shots
    p_one = counts.get("1", 0) / shots

    overlap_squared = max(0.0, min(1.0, 2 * p_zero - 1))
    similarity = float(np.sqrt(overlap_squared))
    return QuantumSimilarityResult(
        similarity=similarity,
        p_zero=p_zero,
        p_one=p_one,
        execution_ms=elapsed,
        qasm=qasm2.dumps(swap_circuit),
    )


def superposition_distribution(scores: Dict[int, float], temperature: float = 0.75) -> Dict[int, float]:
    if not scores:
        return {}
    clipped = {k: max(v, 0.0) for k, v in scores.items()}
    values = np.array(list(clipped.values()), dtype=float)
    if float(values.max()) == 0.0:
        probs = np.ones_like(values) / len(values)
    else:
        logits = values / max(temperature, 1e-6)
        logits = logits - np.max(logits)
        exp = np.exp(logits)
        probs = exp / np.sum(exp)
    return {movie_id: float(prob) for movie_id, prob in zip(clipped.keys(), probs)}


def hadamard_feature_map(num_qubits: int) -> Tuple[QuantumCircuit, str]:
    qc = QuantumCircuit(num_qubits, num_qubits)
    for i in range(num_qubits):
        qc.h(i)
    qc.measure(range(num_qubits), range(num_qubits))
    return qc, qasm2.dumps(qc)
