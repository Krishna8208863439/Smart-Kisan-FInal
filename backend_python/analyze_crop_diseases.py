"""
analyze_crop_diseases.py
========================
Smart Kisan — Crop Disease Dataset Analysis & End-to-End Verification
----------------------------------------------------------------------
This script:
  1. Analyses the local PlantVillage image dataset (via dataset_loader.py)
  2. Analyses the Crop_recommendation.csv dataset
  3. Optionally trains the model if weights are missing
  4. Runs end-to-end inference on a sample image
  5. Writes a JSON report to crop_disease_analysis_report.json

Usage:
    python analyze_crop_diseases.py          # full pipeline
    python analyze_crop_diseases.py --skip-train  # skip training step
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime

# Reconfigure stdout/stderr to UTF-8 on Windows
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except AttributeError:
    pass

# Ensure backend_python is importable
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
if THIS_DIR not in sys.path:
    sys.path.insert(0, THIS_DIR)

from dataset_loader import (
    get_dataset_summary,
    get_csv_summary,
    get_sample_images,
    CLASSES_JSON,
    PLANTVILLAGE_COLOR_DIR,
)
from ml_model import predict_image, get_gemini_api_key


# ── Helpers ──────────────────────────────────────────────────────────────────

def _weights_exist() -> tuple[bool, str]:
    """Return (exists, path) for the best available weight file."""
    for name in ("crop_model_weights.pth", "disease_model_weights.pth"):
        path = os.path.join(THIS_DIR, name)
        if os.path.exists(path):
            return True, path
    return False, ""


def _classes_exist() -> bool:
    return CLASSES_JSON.exists()


# ── Main analysis pipeline ───────────────────────────────────────────────────

def run_analysis(skip_train: bool = False) -> None:
    sep = "=" * 65
    print(sep)
    print("     Smart Kisan — Crop Disease Analysis & Verification")
    print(sep)

    report: dict = {
        "status":    "success",
        "timestamp": datetime.now().isoformat(),
        "crop_recommendation_analysis": {},
        "disease_image_dataset_analysis": {},
        "model_verification": {},
        "inference_test": {},
    }

    # ── Step 1: Crop Recommendation CSV ─────────────────────────────────
    print("\n[Step 1] Analysing Crop Recommendation CSV Dataset...")
    csv_summary = get_csv_summary()

    if csv_summary["status"] == "found":
        print(f"  File    : {csv_summary['path']}")
        print(f"  Records : {csv_summary['total_records']:,}")
        print(f"  Crops   : {csv_summary['crop_count']} unique")
        print(f"  Features: {', '.join(csv_summary['features'])}")
        if "feature_stats" in csv_summary:
            for col, stats in csv_summary["feature_stats"].items():
                print(f"    {col}: min={stats['min']:.1f}  max={stats['max']:.1f}  mean={stats['mean']:.2f}")
    else:
        print(f"  ⚠ CSV not found: {csv_summary.get('path', 'N/A')}")

    report["crop_recommendation_analysis"] = csv_summary

    # ── Step 2: PlantVillage Image Dataset ───────────────────────────────
    print("\n[Step 2] Analysing PlantVillage Crop Disease Image Dataset...")
    ds_summary = get_dataset_summary()

    if ds_summary["status"] == "found":
        print(f"  Directory : {ds_summary['directory']}")
        print(f"  Classes   : {ds_summary['classes_count']}")
        print(f"  Images    : {ds_summary['total_images']:,}")
        print(f"  Crops     : {', '.join(ds_summary['unique_crops'])}")
        print("\n  Class distribution:")
        for cls, cnt in ds_summary["class_distribution"].items():
            bar = "█" * (cnt // 150)
            print(f"    {cls:<57} {cnt:>5}  {bar}")
    else:
        print(f"  ⚠ Dataset not found at: {ds_summary['directory']}")
        print("    Place the PlantVillage dataset at:")
        print(f"    {PLANTVILLAGE_COLOR_DIR}")

    report["disease_image_dataset_analysis"] = ds_summary

    # ── Step 3: Model weight verification / training ─────────────────────
    print("\n[Step 3] Verifying ML Model Weights...")
    weights_found, weights_path = _weights_exist()
    classes_found = _classes_exist()

    if weights_found and classes_found:
        print(f"  ✔ Existing weights : {weights_path}")
        print(f"  ✔ Classes JSON     : {CLASSES_JSON}")
        report["model_verification"] = {
            "weights_path":  weights_path,
            "classes_path":  str(CLASSES_JSON),
            "weights_exist": True,
            "classes_exist": True,
        }
    elif ds_summary["status"] == "found" and not skip_train:
        print("  Weights or classes.json missing — starting 1-epoch fast init training...")
        try:
            from train import train_model
            train_model(
                data_dir=ds_summary["directory"],
                epochs=1,
                batch_size=32,
                lr=0.001,
            )
            weights_found, weights_path = _weights_exist()
            classes_found = _classes_exist()
            report["model_verification"] = {
                "weights_path":  weights_path,
                "classes_path":  str(CLASSES_JSON),
                "weights_exist": weights_found,
                "classes_exist": classes_found,
                "trained_now":   True,
            }
            if weights_found:
                print(f"  ✔ Weights saved to: {weights_path}")
        except Exception as e:
            print(f"  ✗ Training failed: {e}")
            report["model_verification"] = {"error": str(e)}
    else:
        msg = ("Dataset not available for training."
               if ds_summary["status"] != "found"
               else "Training skipped (--skip-train flag set).")
        print(f"  ⚠ {msg}")
        report["model_verification"] = {
            "weights_exist": weights_found,
            "classes_exist": classes_found,
            "note": msg,
        }

    # ── Step 4: End-to-end inference test ───────────────────────────────
    print("\n[Step 4] Running End-to-End Crop Disease Prediction Test...")
    sample_images = get_sample_images(n_per_class=1)

    gemini_key = get_gemini_api_key()
    if gemini_key:
        print("  Gemini API key: configured ✔")
    else:
        print("  Gemini API key: NOT configured (using HuggingFace / local fallback)")

    if sample_images:
        # Pick first available sample
        test_class = next(iter(sample_images))
        test_img_path = sample_images[test_class][0]
        crop_hint = test_class.split("___")[0].replace("_", " ")

        print(f"  Test class : {test_class}")
        print(f"  Test image : {test_img_path}")
        print(f"  Crop hint  : {crop_hint}")

        try:
            with open(test_img_path, "rb") as fh:
                img_bytes = fh.read()

            result = predict_image(
                img_bytes,
                crop_hint=crop_hint,
                filename=os.path.basename(test_img_path),
            )

            print("\n  === Sample Prediction ===")
            print(json.dumps(result, indent=4, ensure_ascii=False))

            report["inference_test"] = {
                "test_image": test_img_path,
                "test_class": test_class,
                "crop_hint":  crop_hint,
                "prediction": result,
            }
        except Exception as e:
            print(f"  ✗ Inference failed: {e}")
            report["inference_test"] = {"error": str(e)}
    else:
        print("  ⚠ No sample images available (dataset not found)")
        report["inference_test"] = {"error": "No sample images available"}

    # ── Step 5: Write report ─────────────────────────────────────────────
    report_path = os.path.join(THIS_DIR, "crop_disease_analysis_report.json")
    try:
        with open(report_path, "w", encoding="utf-8") as rf:
            json.dump(report, rf, indent=2, ensure_ascii=False)
        print(f"\n[Done] Analysis report saved to:\n  {report_path}")
    except Exception as e:
        print(f"\n[Error] Could not save report: {e}")

    print(sep)


# ── CLI entry point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Smart Kisan Crop Disease Dataset Analysis"
    )
    parser.add_argument(
        "--skip-train", action="store_true",
        help="Skip training even when weights are missing"
    )
    args = parser.parse_args()
    run_analysis(skip_train=args.skip_train)
