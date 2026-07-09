"""FastAPI application factory for GitForge.

Wires the dependency-injection provider into ``app.state`` at startup, mounts
the repository router, and enables permissive CORS for the Vite dev server. The
app is created via a factory so tests can spin up isolated instances pointed at
a temp data directory.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .api.dependencies import DATA_DIR, get_provider
from .api.routes import router
from .dto import ImportRepoRequest, ImportStatusDTO
from .repositories import RepositoryProvider
from .services.import_service import import_github


def create_app(data_dir: Path | None = None) -> FastAPI:
    resolved = Path(data_dir or DATA_DIR)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.provider = RepositoryProvider(resolved)
        # Warm the demo repo so the first UI load is instant.
        app.state.provider.get_or_seed_demo()
        yield

    app = FastAPI(
        title="GitForge API",
        version="0.1.0",
        summary="A Git-inspired version control engine with developer insights.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # dev-only; tighten for production
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)

    @app.get("/api/health", tags=["meta"])
    def health():
        return {"status": "ok", "service": "gitforge"}

    @app.get("/api/repos", tags=["repository"])
    def list_repos():
        return {"repositories": app.state.provider.list_names()}

    @app.post("/api/import/github", tags=["import"])
    def import_remote(
        body: ImportRepoRequest,
        provider: RepositoryProvider = Depends(get_provider),
    ):
        try:
            name, count = import_github(body.repo_url, provider, name=body.name)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        return ImportStatusDTO(name=name, commit_count=count, status="imported")

    return app


# Module-level app for ``uvicorn app.main:app``.
app = create_app()
