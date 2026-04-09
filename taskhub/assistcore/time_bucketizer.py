from typing import List, Dict, Union, Tuple

def generate_activity_heatmap(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10,
    normalize: bool = True,
    with_ranges: bool = False
) -> Union[List[float], List[Dict[str, Union[Tuple[int, int], float]]]]:
    """
    Bucket activity counts into 'buckets' time intervals.

    Args:
        timestamps: list of epoch ms timestamps
        counts: list of integer counts per timestamp
        buckets: number of time buckets
        normalize: whether to scale values to [0.0–1.0]
        with_ranges: if True, return bucket ranges along with values

    Returns:
        - If with_ranges=False: list of counts or normalized floats
        - If with_ranges=True: list of dicts with { "range": (start, end), "value": v }
    """
    if not timestamps:
        return [] if not with_ranges else []

    t_min, t_max = min(timestamps), max(timestamps)
    span = t_max - t_min or 1
    bucket_size = span / buckets

    agg = [0] * buckets
    for t, c in zip(timestamps, counts):
        idx = min(buckets - 1, int((t - t_min) / bucket_size))
        agg[idx] += c

    # normalization
    if normalize:
        m = max(agg) or 1
        values = [round(val / m, 4) for val in agg]
    else:
        values = agg

    if not with_ranges:
        return values

    ranges: List[Dict[str, Union[Tuple[int, int], float]]] = []
    for i, val in enumerate(values):
        start = int(t_min + i * bucket_size)
        end = int(start + bucket_size)
        ranges.append({"range": (start, end), "value": val})
    return ranges
