from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os

app = FastAPI(title="Claude Signal API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CalibrationEntry(BaseModel):
    assumption_id: str
    trace_id: str
    decision_type: str
    timestamp: int

class CalibrationState(BaseModel):
    count: int
    decisions: List[CalibrationEntry]

# In-memory store for prototype (replace with DB in production)
_store = {}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/api/calibration/{user_id}")
def get_calibration(user_id: str):
    return _store.get(user_id, {"count": 0, "decisions": []})

@app.post("/api/calibration/{user_id}")
def save_calibration(user_id: str, state: CalibrationState):
    _store[user_id] = state.dict()
    return {"saved": True}

@app.delete("/api/calibration/{user_id}")
def clear_calibration(user_id: str):
    _store.pop(user_id, None)
    return {"cleared": True}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
