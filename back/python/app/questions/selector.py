from typing import Any, Protocol


class QuestionSelector(Protocol):
    def select_next_question(self, state: dict[str, Any]) -> dict[str, Any] | None:
        """Choose only from a reviewed Question Bank after mandatory safety checks."""
        ...
