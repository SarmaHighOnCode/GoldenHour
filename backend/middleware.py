from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings


def add_cors_middleware(app: FastAPI) -> None:
    """Allow the frontend (served from a different origin) to call the API.

    Origins come from the ``CORS_ORIGINS`` env var (comma-separated), defaulting
    to ``*`` for local development. Credentials are only enabled when an
    explicit origin list is configured, since browsers reject
    ``allow_credentials`` together with the ``*`` wildcard.
    """
    origins = settings.cors_origins
    wildcard = origins == ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=not wildcard,
        allow_methods=["*"],
        allow_headers=["*"],
    )
