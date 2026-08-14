"""
dataset_loader.py
=================
Smart Kisan - PlantVillage Dataset Loader & Analysis Utility
-------------------------------------------------------------
This module handles:
  1. Loading and exploring the local PlantVillage disease image dataset
  2. Building a PyTorch ImageFolder DataLoader for training / evaluation
  3. Generating dataset statistics and sample summaries
  4. Providing a unified interface used by train.py and analyze_crop_diseases.py

Dataset expected structure (relative to project root):
    datasets/
        plantvillage dataset/
            color/
                Apple___Apple_scab/
                    img1.jpg  img2.jpg  ...
                Apple___Black_rot/
                    ...
                Corn_(maize)___Northern_Leaf_Blight/
                    ...
                (16 classes total — see classes.json)
        Crop_recommendation.csv

Author: Smart Kisan Team
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# ── Optional heavy imports — only required during training/analysis ────────
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

try:
    import torch
    from torch.utils.data import DataLoader, Subset, random_split
    from torchvision import datasets, transforms
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

# ── Path resolution ─────────────────────────────────────────────────────────
THIS_DIR   = Path(__file__).resolve().parent          # backend_python/
ROOT_DIR   = THIS_DIR.parent                          # smart-kisan/
DATA_DIR   = ROOT_DIR / "datasets"
PLANTVILLAGE_COLOR_DIR = DATA_DIR / "plantvillage dataset" / "color"
CSV_PATH   = DATA_DIR / "Crop_recommendation.csv"
CLASSES_JSON = THIS_DIR / "classes.json"

# ── Image transforms ─────────────────────────────────────────────────────────
TRAIN_TRANSFORMS = None
VAL_TRANSFORMS   = None

if TORCH_AVAILABLE:
    TRAIN_TRANSFORMS = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(p=0.15),
        transforms.RandomRotation(20),
        transforms.ColorJitter(brightness=0.25, contrast=0.25, saturation=0.15),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])

    VAL_TRANSFORMS = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])


# ── Core helpers ─────────────────────────────────────────────────────────────

def get_plantvillage_dir() -> Optional[Path]:
    """Return the PlantVillage color dataset directory if it exists."""
    if PLANTVILLAGE_COLOR_DIR.exists():
        return PLANTVILLAGE_COLOR_DIR
    return None


def get_csv_path() -> Optional[Path]:
    """Return the Crop_recommendation.csv path if it exists."""
    if CSV_PATH.exists():
        return CSV_PATH
    return None


def list_disease_classes() -> List[str]:
    """
    Return sorted list of disease class folder names from the local dataset.
    Falls back to classes.json if the dataset directory is not present.
    """
    dir_path = get_plantvillage_dir()
    if dir_path:
        classes = sorted([
            d.name for d in dir_path.iterdir()
            if d.is_dir()
        ])
        if classes:
            return classes

    # Fallback: read from classes.json
    if CLASSES_JSON.exists():
        try:
            with open(CLASSES_JSON, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    return []


def count_images_per_class() -> Dict[str, int]:
    """
    Return a dict mapping each disease class to the number of images it contains.
    Only counts .jpg, .jpeg, .png files.
    """
    dir_path = get_plantvillage_dir()
    if not dir_path:
        return {}

    result: Dict[str, int] = {}
    valid_exts = {".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"}

    for class_dir in sorted(dir_path.iterdir()):
        if class_dir.is_dir():
            count = sum(
                1 for f in class_dir.iterdir()
                if f.is_file() and f.suffix in valid_exts
            )
            result[class_dir.name] = count

    return result


def get_sample_images(n_per_class: int = 1) -> Dict[str, List[str]]:
    """
    Return up to `n_per_class` sample image paths for each class.
    Returns dict[class_name -> list[absolute_path_str]].
    """
    dir_path = get_plantvillage_dir()
    if not dir_path:
        return {}

    valid_exts = {".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"}
    result: Dict[str, List[str]] = {}

    for class_dir in sorted(dir_path.iterdir()):
        if class_dir.is_dir():
            images = [
                str(f) for f in sorted(class_dir.iterdir())
                if f.is_file() and f.suffix in valid_exts
            ][:n_per_class]
            if images:
                result[class_dir.name] = images

    return result


def get_dataset_summary() -> Dict:
    """
    Return a comprehensive summary dict of the PlantVillage dataset.
    """
    dir_path = get_plantvillage_dir()
    if not dir_path:
        return {
            "status": "not_found",
            "directory": str(PLANTVILLAGE_COLOR_DIR),
            "classes": [],
            "total_images": 0,
            "class_distribution": {}
        }

    class_dist = count_images_per_class()
    total      = sum(class_dist.values())
    classes    = sorted(class_dist.keys())

    # Identify unique crop types
    crops = set()
    for cls in classes:
        crop = cls.split("___")[0].replace("_", " ").strip()
        crops.add(crop)

    return {
        "status":             "found",
        "directory":          str(dir_path),
        "classes_count":      len(classes),
        "classes":            classes,
        "total_images":       total,
        "unique_crops":       sorted(crops),
        "class_distribution": class_dist,
    }


def get_csv_summary() -> Dict:
    """
    Return a summary of the Crop_recommendation.csv dataset.
    Requires pandas.
    """
    csv_path = get_csv_path()
    if not csv_path:
        return {
            "status": "not_found",
            "path": str(CSV_PATH)
        }

    if not PANDAS_AVAILABLE:
        return {
            "status": "pandas_not_installed",
            "path": str(csv_path),
            "message": "Install pandas to read CSV: pip install pandas"
        }

    try:
        df = pd.read_csv(csv_path)
        features = [c for c in df.columns if c != "label"]
        unique_crops = df["label"].unique().tolist() if "label" in df.columns else []
        stats: Dict = {}
        for col in ["N", "P", "K", "ph", "rainfall", "temperature", "humidity"]:
            if col in df.columns:
                stats[col] = {
                    "min":  float(df[col].min()),
                    "max":  float(df[col].max()),
                    "mean": float(df[col].mean()),
                    "std":  float(df[col].std()),
                }

        return {
            "status":           "found",
            "path":             str(csv_path),
            "total_records":    len(df),
            "features":         features,
            "unique_crops":     unique_crops,
            "crop_count":       len(unique_crops),
            "feature_stats":    stats
        }
    except Exception as e:
        return {"status": "error", "path": str(csv_path), "error": str(e)}


# ── PyTorch DataLoader builders ───────────────────────────────────────────────

def build_train_val_loaders(
    batch_size: int = 32,
    val_split: float = 0.2,
    num_workers: int = 0,
    seed: int = 42,
) -> Tuple:
    """
    Build train and validation DataLoaders from the local PlantVillage dataset.

    Returns:
        (train_loader, val_loader, num_classes, class_names)
        Returns (None, None, 0, []) if dataset or PyTorch unavailable.
    """
    if not TORCH_AVAILABLE:
        print("[DatasetLoader] PyTorch not available. Cannot build DataLoaders.")
        return None, None, 0, []

    dir_path = get_plantvillage_dir()
    if not dir_path:
        print(f"[DatasetLoader] Dataset not found at: {PLANTVILLAGE_COLOR_DIR}")
        return None, None, 0, []

    # Full dataset with no transforms first (transforms applied per-split)
    full_dataset = datasets.ImageFolder(root=str(dir_path))
    class_names  = full_dataset.classes
    num_classes  = len(class_names)

    print(f"[DatasetLoader] Found {len(full_dataset)} images in {num_classes} classes.")
    for i, cls in enumerate(class_names):
        print(f"  [{i:02d}] {cls}")

    # Save updated classes.json
    try:
        with open(str(CLASSES_JSON), "w", encoding="utf-8") as f:
            json.dump(class_names, f, indent=2)
        print(f"[DatasetLoader] Saved {len(class_names)} classes to {CLASSES_JSON}")
    except Exception as e:
        print(f"[DatasetLoader] Warning: Could not save classes.json: {e}")

    # Split
    total     = len(full_dataset)
    val_len   = max(1, int(total * val_split))
    train_len = total - val_len

    generator = torch.Generator().manual_seed(seed)
    train_subset, val_subset = random_split(
        full_dataset, [train_len, val_len], generator=generator
    )

    # Apply transforms to each split via a wrapper
    class _TransformWrapper(torch.utils.data.Dataset):
        def __init__(self, subset, transform):
            self.subset    = subset
            self.transform = transform

        def __len__(self):
            return len(self.subset)

        def __getitem__(self, idx):
            img, label = self.subset[idx]
            if self.transform:
                img = self.transform(img)
            return img, label

    train_ds = _TransformWrapper(train_subset, TRAIN_TRANSFORMS)
    val_ds   = _TransformWrapper(val_subset,   VAL_TRANSFORMS)

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available()
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available()
    )

    print(f"[DatasetLoader] Train: {len(train_ds)} images  |  Val: {len(val_ds)} images")
    return train_loader, val_loader, num_classes, class_names


def build_inference_loader(batch_size: int = 32, num_workers: int = 0):
    """
    Build a DataLoader that iterates over the full dataset (for eval / feature extraction).
    """
    if not TORCH_AVAILABLE:
        return None, 0, []

    dir_path = get_plantvillage_dir()
    if not dir_path:
        return None, 0, []

    dataset = datasets.ImageFolder(root=str(dir_path), transform=VAL_TRANSFORMS)
    loader  = DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers
    )
    return loader, len(dataset.classes), dataset.classes


# ── CLI quick-check ───────────────────────────────────────────────────────────

def print_full_summary():
    """Print a detailed dataset summary to stdout."""
    print("=" * 65)
    print("    Smart Kisan — Dataset Loader Summary")
    print("=" * 65)

    # Image dataset
    print("\n[1] PlantVillage Image Dataset")
    summary = get_dataset_summary()
    if summary["status"] == "found":
        print(f"    Directory : {summary['directory']}")
        print(f"    Classes   : {summary['classes_count']}")
        print(f"    Images    : {summary['total_images']:,}")
        print(f"    Crops     : {', '.join(summary['unique_crops'])}")
        print("\n    Class Distribution:")
        for cls, cnt in summary["class_distribution"].items():
            bar = "█" * (cnt // 100)
            print(f"      {cls:<55} {cnt:>5}  {bar}")
    else:
        print(f"    ⚠ Dataset not found at: {summary['directory']}")
        print("      Expected: datasets/plantvillage dataset/color/")

    # CSV dataset
    print("\n[2] Crop Recommendation CSV")
    csv_summary = get_csv_summary()
    if csv_summary["status"] == "found":
        print(f"    File      : {csv_summary['path']}")
        print(f"    Records   : {csv_summary['total_records']:,}")
        print(f"    Crops     : {csv_summary['crop_count']} unique")
        print(f"    Features  : {', '.join(csv_summary['features'])}")
    else:
        print(f"    ⚠ {csv_summary.get('message', 'Not found')}")

    print("\n" + "=" * 65)


if __name__ == "__main__":
    # Reconfigure stdout for UTF-8 on Windows
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass
    print_full_summary()
