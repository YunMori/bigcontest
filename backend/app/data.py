from pathlib import Path

from .models import Dataset


def load_dataset(path: Path) -> Dataset:
    """Load lazily so imports and health work before the shared file arrives."""
    return Dataset.model_validate_json(path.read_text(encoding="utf-8"))
