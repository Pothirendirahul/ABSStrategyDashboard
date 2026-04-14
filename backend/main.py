from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pydantic import BaseModel
import joblib

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODEL_PATH = BACKEND_DIR / "challenge_model.pkl"

challenges = pd.read_csv(DATA_DIR / "abs_challenges.csv")
pitches = pd.read_csv(DATA_DIR / "pitches.csv")
players = pd.read_csv(DATA_DIR / "players.csv")

df = challenges.merge(pitches, on="challenge_id", how="left")
df = df.merge(players, left_on="challenger_player_id", right_on="player_id", how="left")
df["is_success"] = df["challenge_result"].apply(lambda x: 1 if x == "overturned" else 0)

model = joblib.load(MODEL_PATH)


@app.get("/")
def home():
    return {"message": "ABS Dashboard backend is running"}


@app.get("/summary")
def get_summary():
    return {
        "total_challenges": int(len(df)),
        "success_rate":     float(df["is_success"].mean()),
    }


@app.get("/player-stats")
def player_stats():
    # FIX: include team_name, primary_position, and overturned count
    stats = (
        df.groupby(["player_name", "team_name", "primary_position"])
        .agg(
            total_challenges=("challenge_id",  "count"),
            overturned=      ("is_success",     "sum"),
            success_rate=    ("is_success",     "mean"),
        )
        .reset_index()
        .sort_values(by="total_challenges", ascending=False)
        .head(20)
    )
    # Rename so frontend gets "position" not "primary_position"
    stats = stats.rename(columns={"primary_position": "position"})
    stats["overturned"] = stats["overturned"].astype(int)
    return stats.to_dict(orient="records")


@app.get("/pitch-map")
def pitch_map():
    # FIX: include team_name so team filter works
    cols = [
        "pitch_x", "pitch_z", "sz_top", "sz_bot",
        "challenge_result", "player_name", "team_name",
        "inning", "balls", "strikes",
    ]
    pitch_data = df[cols].copy()
    pitch_data = pitch_data.dropna(subset=["pitch_x", "pitch_z"])
    return pitch_data.to_dict(orient="records")


@app.get("/challenge-trends")
def challenge_trends():
    trends = (
        df.groupby("inning")
        .agg(
            total_challenges=("challenge_id", "count"),
            success_rate=    ("is_success",   "mean"),
        )
        .reset_index()
        .sort_values(by="inning")
    )
    return trends.to_dict(orient="records")


@app.get("/role-stats")
def role_stats():
    stats = (
        df.groupby("challenger_role")
        .agg(
            total_challenges=("challenge_id", "count"),
            success_rate=    ("is_success",   "mean"),
        )
        .reset_index()
        .sort_values(by="total_challenges", ascending=False)
    )
    return stats.to_dict(orient="records")


class PredictionInput(BaseModel):
    inning:          int
    outs:            int
    balls:           int
    strikes:         int
    pitch_x:         float
    pitch_z:         float
    sz_top:          float
    sz_bot:          float
    challenger_role: str
    original_call:   str
    inning_half:     str


@app.post("/predict")
def predict_challenge(input_data: PredictionInput):
    sample      = pd.DataFrame([input_data.dict()])
    probability = model.predict_proba(sample)[0][1]

    if probability >= 0.6:
        recommendation = "Strong challenge candidate"
    elif probability >= 0.4:
        recommendation = "Borderline challenge"
    else:
        recommendation = "Low-value challenge"

    return {
        "predicted_success_probability": float(probability),
        "recommendation":                recommendation,
    }