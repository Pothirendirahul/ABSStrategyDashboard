import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, roc_auc_score


def load_data():
    challenges = pd.read_csv("../data/abs_challenges.csv")
    pitches = pd.read_csv("../data/pitches.csv")

    df = challenges.merge(pitches, on="challenge_id", how="left")
    df["is_success"] = (df["challenge_result"] == "overturned").astype(int)

    return df


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    features = [
        "inning",
        "outs",
        "balls",
        "strikes",
        "pitch_x",
        "pitch_z",
        "sz_top",
        "sz_bot",
        "challenger_role",
        "original_call",
        "inning_half",
    ]

    df = df[features + ["is_success"]].dropna().copy()
    return df


def train():
    df = load_data()
    df = build_features(df)

    X = df.drop(columns=["is_success"])
    y = df["is_success"]

    numeric_features = [
        "inning",
        "outs",
        "balls",
        "strikes",
        "pitch_x",
        "pitch_z",
        "sz_top",
        "sz_bot",
    ]

    categorical_features = [
        "challenger_role",
        "original_call",
        "inning_half",
    ]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
        ]
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", LogisticRegression(max_iter=1000)),
        ]
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    model.fit(X_train, y_train)

    pred_labels = model.predict(X_test)
    pred_probs = model.predict_proba(X_test)[:, 1]

    accuracy = accuracy_score(y_test, pred_labels)
    auc = roc_auc_score(y_test, pred_probs)

    print(f"Accuracy: {accuracy:.3f}")
    print(f"ROC AUC: {auc:.3f}")

    joblib.dump(model, "challenge_model.pkl")
    print("Saved model to challenge_model.pkl")


if __name__ == "__main__":
    train()