from typing import Any, Protocol, Sequence


class RankingModel(Protocol):
    def rank(
        self,
        context: dict[str, Any],
        candidates: Sequence[dict[str, Any]],
    ) -> Sequence[dict[str, Any]]:
        """Rank an already-filtered candidate set; never make safety decisions."""
        ...
