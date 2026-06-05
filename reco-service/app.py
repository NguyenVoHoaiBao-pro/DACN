"""
app.py — FastAPI microservice gợi ý (Item-based CF).

Chạy: uvicorn app:app --host 0.0.0.0 --port 5003
"""

import os
import sys
import time
import logging

from fastapi import FastAPI, Request, Query, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import py_eureka_client.eureka_client as eureka_client
from dotenv import load_dotenv

load_dotenv()

# Dam bao duong dan goc trong sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from config.settings import API_PORT
from collaborativefiltering.recommend import cf_service
import collaborativefiltering.train as train_pipeline

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Hang so
# ---------------------------------------------------------------------------
DEFAULT_TOP_K = 10
MAX_TOP_K = 50

EUREKA_SERVER_URL = os.getenv("EUREKA_SERVER_URL", "http://localhost:8761/eureka/")
APP_NAME = os.getenv("APP_NAME", "reco-service")
INSTANCE_HOST = os.getenv("INSTANCE_HOST", "localhost")

# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Item-based CF Recommendation Service",
    description="Goi y theo rating da duyet + lich su mua (khong dung user_interactions).",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",       # Spring Boot
        "http://127.0.0.1:8080",
        "http://localhost:3000",        # ReactJS Dev Server
        "http://127.0.0.1:3000",
        "*",                            # Docker / development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

startup_time = time.time()

@app.on_event("startup")
async def startup_event():
    logger.info(f"Bat dau dang ky voi Eureka: {EUREKA_SERVER_URL} voi ten {APP_NAME}")
    try:
        await eureka_client.init_async(
            eureka_server=EUREKA_SERVER_URL,
            app_name=APP_NAME,
            instance_host=INSTANCE_HOST,
            instance_port=int(API_PORT),
            health_check_url="/actuator/health",
        )
        logger.info("Dang ky Eureka THANH CONG!")
    except Exception as e:
        logger.error(f"Loi dang ky Eureka: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Huy dang ky Eureka truoc khi tat may chu...")
    try:
        await eureka_client.stop_async()
    except Exception as e:
        logger.error(f"Loi huy dang ky Eureka: {e}")

# ---------------------------------------------------------------------------
# Middleware: Response Time header
# ---------------------------------------------------------------------------
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Response-Time-Ms"] = str(process_time)
    return response


# ---------------------------------------------------------------------------
# Endpoint: Home & API docs navigation
# ---------------------------------------------------------------------------
@app.get("/")
async def home():
    loaded = cf_service.metadata is not None
    return {
        "service": "Recommendation Microservice (FastAPI)",
        "version": cf_service.metadata.get("version", "N/A") if loaded else "N/A",
        "status": "running" if loaded else "degraded",
        "docs_url": "/docs",
        "endpoints": {
            "health": "GET /health",
            "recommend_modern": "GET /api/recommend?user_id=10001&top_n=10",
            "recommend_legacy": "GET /recommend/10001?top_k=10",
            "retrain": "POST /api/retrain",
        },
    }


# ---------------------------------------------------------------------------
# Endpoint: Health Check (Spring Boot Actuator)
# ---------------------------------------------------------------------------
@app.get("/health")
@app.get("/actuator/health")
async def health():
    loaded = cf_service.metadata is not None
    if not loaded:
        return JSONResponse(
            status_code=503,
            content={
                "status": "DOWN",
                "model_loaded": False,
                "error": "Model chua duoc nap. Hay chay /api/retrain truoc.",
            },
        )

    return {
        "status": "UP",
        "model_loaded": True,
        "model_version": cf_service.metadata.get("version", "N/A"),
        "data_source": cf_service.metadata.get("data_source", "N/A"),
        "total_users": cf_service.metadata["stats"]["users"],
        "total_items": cf_service.metadata["stats"]["products"],
        "total_ratings": cf_service.metadata["stats"]["interactions"],
        "cold_start_pool": len(cf_service.metadata.get("best_sellers", [])),
        "uptime_seconds": round(time.time() - startup_time),
    }


# ---------------------------------------------------------------------------
# Endpoint: Goi y ca nhan hoa (Modern)
# ---------------------------------------------------------------------------
@app.get("/api/recommend")
async def recommend_modern(
    user_id: str = Query(..., description="ID cua nguoi dung can goi y"),
    top_n: int = Query(DEFAULT_TOP_K, description="So san pham can goi y (1-50)"),
):
    """Endpoint goi y ca nhan hoa."""
    t0 = time.time()
    top_n = max(1, min(top_n, MAX_TOP_K))

    try:
        strategy, recommendations = cf_service.get_recommendations(user_id, top_n=top_n)
        elapsed = round((time.time() - t0) * 1000, 2)

        return {
            "user_id": user_id,
            "status": "success",
            "strategy": strategy,
            "top_k": top_n,
            "response_time_ms": elapsed,
            "recommendations": recommendations,
        }
    except Exception as exc:
        logger.exception("Loi khi xu ly goi y cho user_id %s", user_id)
        raise HTTPException(status_code=500, detail="Loi may chu noi bo: %s" % str(exc))


# ---------------------------------------------------------------------------
# Endpoint: Tuong thich nguoc Spring Boot (Legacy)
# ---------------------------------------------------------------------------
@app.get("/recommend/{user_id}")
async def recommend_legacy(
    user_id: str,
    top_k: int = Query(DEFAULT_TOP_K, description="So san pham can goi y (1-50)"),
):
    """Endpoint tuong thich nguoc hoan toan voi he thong Spring Boot cu."""
    t0 = time.time()
    top_k = max(1, min(top_k, MAX_TOP_K))

    try:
        strategy, recommendations = cf_service.get_recommendations(user_id, top_n=top_k)
        elapsed = round((time.time() - t0) * 1000, 2)

        status_label = "personalized" if "Collaborative" in strategy else "cold_start"

        return {
            "user_id": user_id,
            "status": status_label,
            "top_k": top_k,
            "total_candidates": len(recommendations),
            "response_time_ms": elapsed,
            "recommendations": recommendations,
        }
    except Exception as exc:
        logger.exception("Loi xu ly legacy recommend cho user_id %s", user_id)
        raise HTTPException(status_code=500, detail="Loi may chu: %s" % str(exc))


# ---------------------------------------------------------------------------
# Background Retrain & Hot-Reload
# ---------------------------------------------------------------------------
def _background_retrain_and_reload():
    """Chay ngam huan luyen lai model va reload vao RAM."""
    try:
        logger.info("RETRAIN: Bat dau chay lai luong huan luyen offline...")
        train_pipeline.main()
        logger.info("RETRAIN: Huan luyen hoan thanh. Dang hot-reload...")

        success = cf_service.load_model()
        if success:
            logger.info("RETRAIN: Hot reload model moi thanh cong!")
        else:
            logger.error("RETRAIN: Loi nap lai model moi.")
    except Exception as exc:
        logger.error("RETRAIN: Loi nghiem trong khi chay ngam: %s", exc)


@app.post("/api/retrain")
async def trigger_retrain(background_tasks: BackgroundTasks):
    """Kich hoat chay huan luyen ngam (Async Background Task)."""
    background_tasks.add_task(_background_retrain_and_reload)
    return {
        "status": "accepted",
        "message": "Da bat dau tien trinh huan luyen lai model ngam.",
    }


# ---------------------------------------------------------------------------
# Direct execution
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    logger.info("Dang khoi dong FastAPI CF Service tai cong %d...", API_PORT)
    uvicorn.run("app:app", host="0.0.0.0", port=API_PORT, reload=False)
