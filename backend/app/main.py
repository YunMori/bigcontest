from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from .config import Settings
from .data import load_dataset
from .graph import execute_run
from .models import Dataset, RunRequest, RunResult
from .store import RunStore


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    application = FastAPI(
        title="동행 관측소 — 합성 데이터 시연 API", version="0.1.0",
        description="실제 LangGraph 흐름 + 결정적 mock. 실제 LLM·학습 모델·정책 시스템 미연결.",
    )
    application.add_middleware(
        CORSMiddleware, allow_origins=list(settings.cors_origins),
        allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Content-Type"],
    )
    store = RunStore(settings.max_runs, settings.run_ttl_seconds)
    application.state.run_store = store

    def require_mock():
        if settings.mode == "live":
            raise HTTPException(status_code=501, detail="live 모드는 실제 모델·정책 시스템 미연결로 사용할 수 없습니다. mock으로 자동 전환하지 않습니다.")

    def dataset():
        require_mock()
        try:
            return load_dataset(settings.dataset_path)
        except (OSError, UnicodeError, ValidationError) as exc:
            raise HTTPException(status_code=503, detail="공유 시연 데이터가 없거나 계약 형식이 유효하지 않습니다.") from exc

    @application.get("/api/health")
    def health():
        require_mock()
        return {"status": "ok", "mode": "mock", "graph": "langgraph"}

    @application.get("/api/districts", response_model=Dataset)
    def districts():
        return dataset()

    @application.post("/api/runs", response_model=RunResult)
    def run(request: RunRequest):
        data = dataset()
        if not any(d.code == request.district_code for d in data.districts):
            raise HTTPException(status_code=404, detail="요청한 행정동을 찾을 수 없습니다.")
        result = execute_run(data, request)
        store.put(result)
        return result

    @application.get("/api/runs/{run_id}", response_model=RunResult)
    def get_run(run_id: str):
        require_mock()
        result = store.get(run_id)
        if result is None:
            raise HTTPException(status_code=404, detail="실행 기록이 없거나 만료되었습니다. 시연 기록은 서버 재시작 시 사라집니다.")
        return result

    return application


app = create_app()
