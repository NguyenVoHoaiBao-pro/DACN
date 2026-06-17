"""
app.py — FastAPI microservice gợi ý (SVD Collaborative Filtering).

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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from config.settings import API_PORT
from collaborativefiltering.recommend import reco_service
import collaborativefiltering.train as train_pipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

DEFAULT_TOP_K = 10
MAX_TOP_K = 50

EUREKA_SERVER_URL = os.getenv("EUREKA_SERVER_URL", "http://localhost:8761/eureka/")
APP_NAME = os.getenv("APP_NAME", "reco-service")
INSTANCE_HOST = os.getenv("INSTANCE_HOST", "localhost")

app = FastAPI(
    title="SVD Recommendation Service",
    description="Gợi ý sản phẩm bằng SVD (đặc trưng ẩn). Cold-start → sản phẩm bán chạy.",
    version="5.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

startup_time = time.time()


@app.on_event("startup")
async def startup_event():
    logger.info("Đăng ký Eureka: %s — app=%s", EUREKA_SERVER_URL, APP_NAME)
    try:
        await eureka_client.init_async(
            eureka_server=EUREKA_SERVER_URL,
            app_name=APP_NAME,
            instance_host=INSTANCE_HOST,
            instance_port=int(API_PORT),
            health_check_url="/actuator/health",
        )
        logger.info("Đăng ký Eureka thành công!")
    except Exception as e:
        logger.error("Lỗi đăng ký Eureka: %s", e)


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Hủy đăng ký Eureka...")
    try:
        await eureka_client.stop_async()
    except Exception as e:
        logger.error("Lỗi hủy đăng ký Eureka: %s", e)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Response-Time-Ms"] = str(process_time)
    return response


@app.get("/")
async def home():
    loaded = reco_service.metadata is not None
    return {
        "service": "Recommendation Microservice (SVD)",
        "version": reco_service.metadata.get("version", "N/A") if loaded else "N/A",
        "model_type": reco_service.metadata.get("model_type", "N/A") if loaded else "N/A",
        "status": "running" if loaded else "degraded",
        "docs_url": "/docs",
        "endpoints": {
            "health": "GET /health",
            "recommend_modern": "GET /api/recommend?user_id=10001&top_n=10",
            "recommend_legacy": "GET /recommend/10001?top_k=10",
            "retrain": "POST /api/retrain",
        },
    }


@app.get("/health")
@app.get("/actuator/health")
async def health():
    loaded = reco_service.metadata is not None
    if not loaded:
        return JSONResponse(
            status_code=503,
            content={
                "status": "DOWN",
                "model_loaded": False,
                "error": "Model chưa được nạp. Hãy chạy /api/retrain trước.",
            },
        )

    perf = reco_service.metadata.get("performance", {})
    return {
        "status": "UP",
        "model_loaded": True,
        "model_type": reco_service.metadata.get("model_type", "svd_latent_factors"),
        "model_version": reco_service.metadata.get("version", "N/A"),
        "data_source": reco_service.metadata.get("data_source", "N/A"),
        "total_users": reco_service.metadata["stats"]["users"],
        "total_items": reco_service.metadata["stats"]["products"],
        "total_ratings": reco_service.metadata["stats"]["interactions"],
        "sparsity_pct": reco_service.metadata["stats"].get("sparsity_pct"),
        "rmse": perf.get("rmse"),
        "mae": perf.get("mae"),
        "cold_start_pool": len(reco_service.metadata.get("best_sellers", [])),
        "uptime_seconds": round(time.time() - startup_time),
    }


@app.get("/api/recommend")
async def recommend_modern(
    user_id: str = Query(..., description="ID người dùng cần gợi ý"),
    top_n: int = Query(DEFAULT_TOP_K, description="Số sản phẩm gợi ý (1-50)"),
):
    t0 = time.time()
    top_n = max(1, min(top_n, MAX_TOP_K))

    try:
        strategy, recommendations = reco_service.get_recommendations(user_id, top_n=top_n)
        elapsed = round((time.time() - t0) * 1000, 2)

        is_cold_start = "cold-start" in strategy.lower() or "Popular" in strategy
        return {
            "user_id": user_id,
            "status": "cold_start" if is_cold_start else "success",
            "strategy": strategy,
            "top_k": top_n,
            "response_time_ms": elapsed,
            "recommendations": recommendations,
        }
    except Exception as exc:
        logger.exception("Lỗi gợi ý cho user_id %s", user_id)
        raise HTTPException(status_code=500, detail="Lỗi máy chủ nội bộ: %s" % str(exc))


@app.get("/recommend/{user_id}")
async def recommend_legacy(
    user_id: str,
    top_k: int = Query(DEFAULT_TOP_K, description="Số sản phẩm gợi ý (1-50)"),
):
    t0 = time.time()
    top_k = max(1, min(top_k, MAX_TOP_K))

    try:
        strategy, recommendations = reco_service.get_recommendations(user_id, top_n=top_k)
        elapsed = round((time.time() - t0) * 1000, 2)

        is_personalized = "SVD" in strategy
        return {
            "user_id": user_id,
            "status": "personalized" if is_personalized else "cold_start",
            "top_k": top_k,
            "total_candidates": len(recommendations),
            "response_time_ms": elapsed,
            "recommendations": recommendations,
        }
    except Exception as exc:
        logger.exception("Lỗi legacy recommend cho user_id %s", user_id)
        raise HTTPException(status_code=500, detail="Lỗi máy chủ: %s" % str(exc))


def _background_retrain_and_reload():
    try:
        logger.info("RETRAIN: Bắt đầu huấn luyện SVD...")
        train_pipeline.main()
        logger.info("RETRAIN: Huấn luyện xong. Hot-reload...")

        success = reco_service.load_model()
        if success:
            logger.info("RETRAIN: Hot reload thành công!")
        else:
            logger.error("RETRAIN: Lỗi nạp lại model.")
    except Exception as exc:
        logger.error("RETRAIN: Lỗi nghiêm trọng: %s", exc)


@app.post("/api/retrain")
async def trigger_retrain(background_tasks: BackgroundTasks):
    background_tasks.add_task(_background_retrain_and_reload)
    return {
        "status": "accepted",
        "message": "Đã bắt đầu huấn luyện lại model SVD (background).",
    }


if __name__ == "__main__":
    import uvicorn

    logger.info("Khởi động SVD Recommendation Service cổng %d...", API_PORT)
    uvicorn.run("app:app", host="0.0.0.0", port=API_PORT, reload=False)
