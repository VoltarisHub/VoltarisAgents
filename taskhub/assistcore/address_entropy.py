import math
from typing import List, Dict, Union

def compute_shannon_entropy(
    addresses: List[str],
    normalized: bool = False,
    return_distribution: bool = False
) -> Union[float, Dict[str, Union[float, Dict[str, float]]]]:
    """
    Compute Shannon entropy (bits) of an address sequence.

    Args:
        addresses: list of string addresses
        normalized: if True, return entropy normalized to [0,1] range
        return_distribution: if True, also return probability distribution

    Returns:
        - If return_distribution=False: float entropy value
        - If return_distribution=True: dict with {"entropy": float, "distribution": {...}}
    """
    if not addresses:
        return {"entropy": 0.0, "distribution": {}} if return_distribution else 0.0

    freq: Dict[str, int] = {}
    for a in addresses:
        freq[a] = freq.get(a, 0) + 1

    total = len(addresses)
    entropy = 0.0
    distribution: Dict[str, float] = {}

    for addr, count in freq.items():
        p = count / total
        distribution[addr] = round(p, 6)
        entropy -= p * math.log2(p)

    # normalization relative to max possible entropy = log2(unique_count)
    if normalized and len(freq) > 1:
        entropy /= math.log2(len(freq))

    entropy = round(entropy, 4)

    if return_distribution:
        return {"entropy": entropy, "distribution": distribution}
    return entropy
