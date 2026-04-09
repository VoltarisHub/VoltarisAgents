from typing import List, Dict, Optional

def detect_volume_bursts(
    volumes: List[float],
    threshold_ratio: float = 1.5,
    min_interval: int = 1,
    timestamps: Optional[List[int]] = None,
    detect_drops: bool = False
) -> List[Dict[str, float]]:
    """
    Identify indices where volume changes sharply by threshold_ratio compared to previous.
    
    Args:
        volumes: list of volume values
        threshold_ratio: multiplier threshold (e.g., 1.5 = +50% jump)
        min_interval: minimal distance between consecutive events
        timestamps: optional list of epoch ms aligned with volumes
        detect_drops: if True, also detect sharp decreases (ratio <= 1/threshold_ratio)
    
    Returns:
        List of dicts with details:
        {
          "index": int,
          "previous": float,
          "current": float,
          "ratio": float,
          "direction": "up" | "down",
          "timestamp": int | None
        }
    """
    events: List[Dict[str, float]] = []
    last_idx = -min_interval

    for i in range(1, len(volumes)):
        prev, curr = volumes[i - 1], volumes[i]
        ratio = (curr / prev) if prev > 0 else float("inf")

        upward = ratio >= threshold_ratio
        downward = detect_drops and prev > 0 and ratio <= 1 / threshold_ratio

        if (upward or downward) and (i - last_idx) >= min_interval:
            events.append({
                "index": i,
                "previous": prev,
                "current": curr,
                "ratio": round(ratio, 4),
                "direction": "up" if upward else "down",
                "timestamp": timestamps[i] if timestamps and i < len(timestamps) else None
            })
            last_idx = i

    return events
