"""
train.py
========
Smart Kisan - Transfer Learning Training Script
------------------------------------------------
Trains a MobileNetV3-Small disease classifier using the local PlantVillage
dataset. When no dataset_dir argument is given it auto-detects the correct
path via dataset_loader.py.

Usage:
    python train.py                    # auto-detect PlantVillage dataset
    python train.py /path/to/dataset   # custom directory
    python train.py --epochs 10 --batch 64 --lr 0.0005
"""

import argparse
import os
import sys

import torch
import torch.nn as nn
import torch.optim as optim

from dataset_loader import (
    build_train_val_loaders,
    get_plantvillage_dir,
    CLASSES_JSON,
)
from ml_model import MobileNetDiseaseClassifier


def train_model(
    data_dir: str = None,
    epochs: int = 10,
    batch_size: int = 32,
    lr: float = 0.001,
    num_workers: int = 0,
):
    """
    Train the MobileNetV3-Small disease classifier.

    Args:
        data_dir:    Path to ImageFolder-structured dataset directory.
                     If None, auto-detects the local PlantVillage dataset.
        epochs:      Number of training epochs.
        batch_size:  Mini-batch size.
        lr:          Learning rate for Adam optimiser.
        num_workers: DataLoader worker processes (0 = main process).
    """
    print("=" * 65)
    print("    Smart Kisan — ML Disease Classifier Training Loop")
    print("=" * 65)

    # ── Resolve dataset directory ──────────────────────────────────────
    if data_dir is None:
        auto = get_plantvillage_dir()
        if auto:
            data_dir = str(auto)
            print(f"[Dataset] Auto-detected PlantVillage dataset: {data_dir}")
        else:
            print("[Error] No dataset found. Provide a path or place the PlantVillage")
            print("        dataset at:  datasets/plantvillage dataset/color/")
            return

    if not os.path.exists(data_dir):
        print(f"[Error] Dataset directory '{data_dir}' not found!")
        return

    # ── Build DataLoaders via dataset_loader ───────────────────────────
    train_loader, val_loader, num_classes, class_names = build_train_val_loaders(
        batch_size=batch_size,
        val_split=0.2,
        num_workers=num_workers,
        seed=42,
    )

    if train_loader is None:
        print("[Error] Failed to build DataLoaders. Aborting training.")
        return

    print(f"\n[Dataset] {num_classes} disease classes detected:")
    for idx, name in enumerate(class_names):
        print(f"  [{idx:02d}] {name}")

    # ── Model ──────────────────────────────────────────────────────────
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n[Device] Training on: {device}")

    model = MobileNetDiseaseClassifier(num_classes=num_classes)
    model.to(device)

    # ── Loss & Optimiser ───────────────────────────────────────────────
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=3, gamma=0.5)

    checkpoint_dir  = os.path.dirname(os.path.abspath(__file__))
    weights_name    = "crop_model_weights.pth" if num_classes > 50 else "disease_model_weights.pth"
    checkpoint_path = os.path.join(checkpoint_dir, weights_name)

    best_val_loss = float("inf")

    # ── Training loop ──────────────────────────────────────────────────
    for epoch in range(epochs):
        # --- Train ---
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss    += loss.item() * images.size(0)
            _, preds       = torch.max(outputs, 1)
            train_correct += (preds == labels).sum().item()
            train_total   += images.size(0)

        epoch_train_loss = train_loss / train_total
        epoch_train_acc  = train_correct / train_total

        # --- Validate ---
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss    = criterion(outputs, labels)

                val_loss    += loss.item() * images.size(0)
                _, preds     = torch.max(outputs, 1)
                val_correct += (preds == labels).sum().item()
                val_total   += images.size(0)

        epoch_val_loss = val_loss / val_total
        epoch_val_acc  = val_correct / val_total

        scheduler.step()

        print(
            f"Epoch {epoch + 1:>3}/{epochs}  |  "
            f"Train  Loss: {epoch_train_loss:.4f}  Acc: {epoch_train_acc:.4f}  |  "
            f"Val    Loss: {epoch_val_loss:.4f}  Acc: {epoch_val_acc:.4f}"
        )

        # --- Save best checkpoint ---
        if epoch_val_loss < best_val_loss:
            best_val_loss = epoch_val_loss
            torch.save(model.state_dict(), checkpoint_path)
            print(f" ✔ Saved best checkpoint → {checkpoint_path}")

    print(f"\n[Training Complete] Best val loss: {best_val_loss:.4f}")
    print(f"[Training Complete] Weights saved: {checkpoint_path}")
    print(f"[Training Complete] Classes JSON : {CLASSES_JSON}")


# ── CLI entry ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

    parser = argparse.ArgumentParser(
        description="Smart Kisan Disease Classifier Training Script"
    )
    parser.add_argument(
        "dataset_dir", nargs="?", default=None,
        help="Path to ImageFolder dataset. Auto-detects PlantVillage if omitted."
    )
    parser.add_argument("--epochs",  type=int,   default=10,    help="Number of epochs (default: 10)")
    parser.add_argument("--batch",   type=int,   default=32,    help="Batch size (default: 32)")
    parser.add_argument("--lr",      type=float, default=0.001, help="Learning rate (default: 0.001)")
    parser.add_argument("--workers", type=int,   default=0,     help="DataLoader workers (default: 0)")

    args = parser.parse_args()
    train_model(
        data_dir=args.dataset_dir,
        epochs=args.epochs,
        batch_size=args.batch,
        lr=args.lr,
        num_workers=args.workers,
    )
