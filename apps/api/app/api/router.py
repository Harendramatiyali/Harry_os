"""Root API router — domain routers are mounted here as modules are implemented."""

from fastapi import APIRouter

from app.api.health import router as liveness_router
from app.modules.auth.router import router as auth_router
from app.modules.planner.router import router as planner_router
from app.modules.trading.router import router as trading_router
from app.modules.books.router import router as books_router
from app.modules.finance.router import router as finance_router
from app.modules.health.router import router as health_tracking_router
from app.modules.ai.router import router as ai_router
from app.modules.knowledge.router import router as knowledge_router

api_router = APIRouter()
api_router.include_router(liveness_router, tags=["health"])
api_router.include_router(auth_router)
api_router.include_router(planner_router)
api_router.include_router(trading_router)
api_router.include_router(books_router)
api_router.include_router(finance_router)
api_router.include_router(health_tracking_router)
api_router.include_router(ai_router)
api_router.include_router(knowledge_router)
