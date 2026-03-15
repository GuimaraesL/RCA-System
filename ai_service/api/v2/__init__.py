from fastapi import APIRouter
from .health import router as health_router
from .fmea import router as fmea_router
from .history import router as history_router
from .recurrence import router as recurrence_router
from .analysis import router as analysis_router

v2_router = APIRouter()
v2_router.include_router(health_router, prefix="/health", tags=["Health"])
v2_router.include_router(fmea_router, prefix="/fmea", tags=["FMEA"])
# Note that in v1 extract-fmea was at root, here we'll map it differently or keep it as /extract-fmea. Let's map it explicitly in main.py if needed, or put it in fmea_router
v2_router.include_router(history_router, prefix="/analyze/history", tags=["History"])
v2_router.include_router(recurrence_router, prefix="/recurrence", tags=["Recurrence"])
v2_router.include_router(analysis_router, prefix="/analyze", tags=["Analysis"])