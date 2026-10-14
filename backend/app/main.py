"""
app/main.py
-----------
FastAPI application factory.
All middleware, routers, and startup logic assembled here.
"""
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.api.v1.endpoints import admin, auth, businesses, cards, stamps, webhooks
from app.core.config import settings
from app.db.session import engine
from app.models.all_models import Base   # noqa: F401 — ensures models are registered

log = structlog.get_logger(__name__)

# ── Rate Limiter ─────────────────────────────────────────────────────────────
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
)


# ── Lifespan (startup / shutdown) ────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("startup", env=settings.APP_ENV, version=settings.APP_VERSION)
    # In production use Alembic migrations, not create_all
    # This is here for local dev convenience only
    if not settings.is_production:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        log.info("dev_tables_created")
    yield
    log.info("shutdown")
    await engine.dispose()


# ── App Factory ──────────────────────────────────────────────────────────────
def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/docs" if not settings.is_production else None,   # hide docs in prod
        redoc_url="/redoc" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── Security Middleware ───────────────────────────────────────────────────
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS + ["*"] if settings.DEBUG else settings.ALLOWED_HOSTS,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
        "https://loyaltycard-omega.vercel.app",
        "https://listenonroads.com",
        "http://localhost:5173",
            ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # ── Request Logging Middleware ────────────────────────────────────────────
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        log.info(
            "request",
            method=request.method,
            path=request.url.path,
            ip=request.client.host if request.client else "unknown",
        )
        response = await call_next(request)
        log.info("response", status_code=response.status_code)
        return response

    # ── Security Headers ──────────────────────────────────────────────────────
    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    # ── Global Exception Handler ──────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def unhandled_exception(request: Request, exc: Exception):
        log.error("unhandled_exception", path=request.url.path, error=str(exc))
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"},
        )

    # ── Routers ───────────────────────────────────────────────────────────────
    PREFIX = "/api/v1"
    app.include_router(auth.router,       prefix=PREFIX)
    app.include_router(businesses.router, prefix=PREFIX)
    app.include_router(stamps.router,     prefix=PREFIX)
    app.include_router(cards.router,      prefix=PREFIX)
    app.include_router(admin.router,      prefix=PREFIX)
    app.include_router(webhooks.router,   prefix=PREFIX)

    # ── Health Check ──────────────────────────────────────────────────────────
    @app.get("/health", tags=["health"])
    async def health():
        return {"status": "ok", "version": settings.APP_VERSION, "env": settings.APP_ENV}

    return app


app = create_app()
