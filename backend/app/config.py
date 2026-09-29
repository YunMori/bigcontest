import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

DEFAULT_DATASET = Path(__file__).resolve().parents[2] / "shared" / "mock" / "dataset.json"


@dataclass(frozen=True)
class Settings:
    mode: Literal["mock", "live"] = "mock"
    dataset_path: Path = DEFAULT_DATASET
    cors_origins: tuple[str, ...] = field(default_factory=lambda: ("http://localhost:5173", "http://127.0.0.1:5173"))
    max_runs: int = 200
    run_ttl_seconds: int = 3600

    def __post_init__(self):
        if self.mode not in ("mock", "live"):
            raise ValueError("APP_MODE must be mock or live")
        if not 1 <= self.max_runs <= 10000 or self.run_ttl_seconds < 1:
            raise ValueError("RUN_STORE_MAX must be 1..10000 and RUN_STORE_TTL_SECONDS positive")

    @classmethod
    def from_env(cls):
        return cls(
            mode=os.getenv("APP_MODE", "mock"),
            dataset_path=Path(os.getenv("DATASET_PATH", str(DEFAULT_DATASET))),
            cors_origins=tuple(x.strip() for x in os.getenv(
                "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
            ).split(",") if x.strip()),
            max_runs=int(os.getenv("RUN_STORE_MAX", "200")),
            run_ttl_seconds=int(os.getenv("RUN_STORE_TTL_SECONDS", "3600")),
        )
