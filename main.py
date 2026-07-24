# main.py
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.routes import router as api_router
from app.config.settings import settings

app = FastAPI(
    title="Naqalchi AI Voice & Avatar Generation API",
    description="Python modular integration server for real-time video generation rendering.",
    version="1.1.0"
)

# Enable CORS for frontend calling from port 3000 / 5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount outputs directory to serve rendered video clips directly
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=settings.OUTPUT_DIR), name="outputs")

# Register our structured modular API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    print(f"[Naqalchi Server] Starting local backend at http://127.0.0.1:8000")
    # Point uvicorn to "main:app" to avoid collision with app/ folder namespace
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
