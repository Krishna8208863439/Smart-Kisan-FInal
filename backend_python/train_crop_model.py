import os
import pickle
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# Paths
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(THIS_DIR)
CSV_PATH = os.path.join(ROOT_DIR, "datasets", "Crop_recommendation.csv")
MODEL_PATH = os.path.join(THIS_DIR, "crop_recommendation_model.pkl")

# Crop Metadata (yield, profit, season, typical soils)
CROP_METADATA_EXTRAS = {
    "rice": {"yield": "2.1 - 2.5 tons/acre", "profit": 85000, "season": "kharif", "soils": ["clay", "loamy"]},
    "maize": {"yield": "2.2 - 2.6 tons/acre", "profit": 60000, "season": "kharif", "soils": ["loamy", "black"]},
    "chickpea": {"yield": "0.6 - 0.8 tons/acre", "profit": 45000, "season": "rabi", "soils": ["clay", "loamy"]},
    "kidneybeans": {"yield": "0.8 - 1.0 tons/acre", "profit": 55000, "season": "rabi", "soils": ["loamy", "black"]},
    "pigeonpeas": {"yield": "0.7 - 0.9 tons/acre", "profit": 50000, "season": "kharif", "soils": ["loamy", "black"]},
    "mothbeans": {"yield": "0.3 - 0.5 tons/acre", "profit": 35000, "season": "kharif", "soils": ["sandy", "loamy"]},
    "mungbean": {"yield": "0.4 - 0.6 tons/acre", "profit": 40000, "season": "zaid", "soils": ["loamy", "sandy"]},
    "blackgram": {"yield": "0.5 - 0.7 tons/acre", "profit": 42000, "season": "kharif", "soils": ["loamy", "black"]},
    "lentil": {"yield": "0.6 - 0.8 tons/acre", "profit": 48000, "season": "rabi", "soils": ["loamy", "clay"]},
    "pomegranate": {"yield": "4.5 - 6.0 tons/acre", "profit": 150000, "season": "whole year", "soils": ["loamy", "black", "sandy"]},
    "banana": {"yield": "12.0 - 15.0 tons/acre", "profit": 180000, "season": "whole year", "soils": ["clay", "loamy", "black"]},
    "mango": {"yield": "3.5 - 5.0 tons/acre", "profit": 160000, "season": "whole year", "soils": ["loamy", "laterite", "black"]},
    "grapes": {"yield": "8.0 - 10.0 tons/acre", "profit": 200000, "season": "rabi", "soils": ["loamy", "sandy"]},
    "watermelon": {"yield": "15.0 - 20.0 tons/acre", "profit": 90000, "season": "zaid", "soils": ["sandy", "loamy"]},
    "muskmelon": {"yield": "10.0 - 12.0 tons/acre", "profit": 80000, "season": "zaid", "soils": ["sandy", "loamy"]},
    "apple": {"yield": "6.0 - 8.0 tons/acre", "profit": 220000, "season": "whole year", "soils": ["loamy", "sandy"]},
    "orange": {"yield": "5.0 - 7.0 tons/acre", "profit": 140000, "season": "whole year", "soils": ["loamy", "sandy", "black"]},
    "papaya": {"yield": "18.0 - 22.0 tons/acre", "profit": 120000, "season": "whole year", "soils": ["loamy", "sandy"]},
    "coconut": {"yield": "4.0 - 5.5 tons/acre", "profit": 130000, "season": "whole year", "soils": ["sandy", "loamy"]},
    "cotton": {"yield": "1.0 - 1.3 tons/acre", "profit": 75000, "season": "kharif", "soils": ["black", "loamy"]},
    "jute": {"yield": "1.2 - 1.5 tons/acre", "profit": 55000, "season": "kharif", "soils": ["loamy", "clay"]},
    "coffee": {"yield": "0.8 - 1.2 tons/acre", "profit": 110000, "season": "whole year", "soils": ["loamy", "laterite"]}
}

def train_crop_model():
    print("=" * 60)
    print("          TRAINING CROP RECOMMENDATION MODEL")
    print("=" * 60)

    if not os.path.exists(CSV_PATH):
        print(f"[Error] Dataset not found at: {CSV_PATH}")
        return False

    df = pd.read_csv(CSV_PATH)
    features = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    
    # Calculate feature stats per crop
    crop_stats = {}
    crops = df["label"].unique()
    for crop in crops:
        crop_df = df[df["label"] == crop]
        extras = CROP_METADATA_EXTRAS.get(crop, {
            "yield": "1.5 - 2.0 tons/acre",
            "profit": 50000,
            "season": "whole year",
            "soils": ["loamy"]
        })
        crop_stats[crop] = {
            "N": float(crop_df["N"].mean()),
            "P": float(crop_df["P"].mean()),
            "K": float(crop_df["K"].mean()),
            "temperature": float(crop_df["temperature"].mean()),
            "humidity": float(crop_df["humidity"].mean()),
            "ph": float(crop_df["ph"].mean()),
            "rainfall": float(crop_df["rainfall"].mean()),
            "yield": extras["yield"],
            "profit": extras["profit"],
            "season": extras["season"],
            "soils": extras["soils"]
        }

    # Split features and labels
    X = df[features]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train Random Forest
    print("[ML] Training RandomForestClassifier model...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"[ML] Model trained successfully! Test Accuracy: {accuracy * 100:.2f}%")

    # Serialize model and metadata
    data = {
        "model": model,
        "features": features,
        "classes": list(model.classes_),
        "crop_stats": crop_stats
    }

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(data, f)
    print(f"[ML] Saved model to: {MODEL_PATH}")
    return True

if __name__ == "__main__":
    train_crop_model()
