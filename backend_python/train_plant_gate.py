"""
train_plant_gate.py
───────────────────
Offline script to fine-tune MobileNetV2 as a binary classifier:
  Class 0: plant  (PlantVillage / PlantDoc crops & leaves)
  Class 1: not_plant (ImageNet / synthetic negative samples: people, cars, objects)

Saves weights to: mobilenetv2_plant_gate.pt

Usage:
  python train_plant_gate.py [--epochs 5] [--batch-size 32] [--lr 0.001]
"""

import os
import sys
import argparse
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("TrainPlantGate")

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torchvision import models, transforms
    from torch.utils.data import DataLoader, Dataset
    from PIL import Image
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.error("PyTorch and torchvision are required to run train_plant_gate.py.")


class SyntheticGateDataset(Dataset):
    """
    In-memory / directory dataset for binary gate training.
    If no dataset directory is provided, generates synthetic color samples
    to verify pipeline execution and save initial binary weights.
    """
    def __init__(self, plant_dir=None, not_plant_dir=None, num_samples=200, transform=None):
        self.samples = []
        self.transform = transform or transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        # Load real plant images if directory provided
        if plant_dir and os.path.exists(plant_dir):
            for root, _, files in os.walk(plant_dir):
                for f in files:
                    if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                        self.samples.append((os.path.join(root, f), 0))

        # Load real non-plant images if directory provided
        if not_plant_dir and os.path.exists(not_plant_dir):
            for root, _, files in os.walk(not_plant_dir):
                for f in files:
                    if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                        self.samples.append((os.path.join(root, f), 1))

        # Fallback to synthetic data if no directories provided or found
        if not self.samples:
            logger.info("No external dataset directories found. Generating synthetic samples for weight initialization...")
            for i in range(num_samples):
                # Class 0: Plant-like green dominant images
                # Class 1: Non-plant non-green random images
                is_plant = (i % 2 == 0)
                label = 0 if is_plant else 1
                self.samples.append((is_plant, label))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        item, label = self.samples[idx]
        if isinstance(item, str):
            try:
                img = Image.open(item).convert("RGB")
            except Exception:
                img = Image.new("RGB", (224, 224), (0, 128, 0) if label == 0 else (128, 128, 128))
        else:
            # Synthetic tensor generation
            if item: # Plant (green dominant)
                img = Image.new("RGB", (224, 224), (34, 139, 34))
            else: # Not plant (grey/red dominant)
                img = Image.new("RGB", (224, 224), (180, 50, 50))

        if self.transform:
            img = self.transform(img)

        return img, label


def train_gate(epochs=3, batch_size=16, lr=0.001, plant_dir=None, not_plant_dir=None):
    if not TORCH_AVAILABLE:
        logger.error("PyTorch not installed. Aborting training.")
        return

    logger.info("Initializing MobileNetV2 binary plant gate model...")
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)
    
    # Replace classifier head for 2 classes (0: plant, 1: not_plant)
    in_features = model.last_channel
    model.classifier[1] = nn.Linear(in_features, 2)

    dataset = SyntheticGateDataset(plant_dir=plant_dir, not_plant_dir=not_plant_dir)
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.classifier.parameters(), lr=lr)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    model.train()

    logger.info(f"Starting training on {device} for {epochs} epochs...")
    for epoch in range(epochs):
        total_loss = 0.0
        correct = 0
        total = 0

        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()

            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            total_loss += loss.item() * images.size(0)
            _, predicted = torch.max(outputs, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()

        epoch_loss = total_loss / total
        accuracy = correct / total
        logger.info(f"Epoch [{epoch+1}/{epochs}] — Loss: {epoch_loss:.4f} | Accuracy: {accuracy*100:.2f}%")

    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mobilenetv2_plant_gate.pt")
    torch.save(model.state_dict(), output_path)
    logger.info(f"Successfully saved MobileNetV2 binary gate weights to {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train MobileNetV2 Plant Validation Gate")
    parser.add_argument("--epochs", type=int, default=3, help="Number of epochs")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate")
    parser.add_argument("--plant-dir", type=str, default=None, help="Directory of positive plant images")
    parser.add_argument("--not-plant-dir", type=str, default=None, help="Directory of negative non-plant images")

    args = parser.parse_args()
    train_gate(epochs=args.epochs, batch_size=args.batch_size, lr=args.lr,
               plant_dir=args.plant_dir, not_plant_dir=args.not_plant_dir)
