import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms
from ml_model import MobileNetDiseaseClassifier, CLASSES

def train_model(data_dir: str, epochs: int = 10, batch_size: int = 32, lr: float = 0.001):
    """
    Production-ready transfer learning script to train/fine-tune the disease classifier.
    
    Expected Folder Structure:
    data_dir/
        class_1_tomato_early_blight/
            img1.jpg
            img2.jpg
        class_2_rice_blast/
            img3.jpg
            ...
    """
    print("=" * 60)
    print("      Smart Kisan - ML Disease Classifier Training Loop")
    print("=" * 60)
    
    # 1. Image preprocessing & Augmentations for small and marginal farm datasets
    train_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # Check if directory exists
    if not os.path.exists(data_dir):
        print(f"[Error] Training directory '{data_dir}' not found!")
        print("Please provide a valid dataset path (e.g. PlantVillage folder) to start training.")
        return
        
    # 2. Setup Dataset & Dataloaders
    dataset = datasets.ImageFolder(root=data_dir)
    num_classes = len(dataset.classes)
    print(f"[Dataset] Found {len(dataset)} images belonging to {num_classes} classes.")
    
    # Map index to directory names
    for idx, class_name in enumerate(dataset.classes):
        print(f" - Index {idx} maps to class folder: {class_name}")

    # Split into 80% Train, 20% Val
    train_len = int(0.8 * len(dataset))
    val_len = len(dataset) - train_len
    train_set, val_set = random_split(dataset, [train_len, val_len])
    
    # Apply specific transforms to splits
    train_set.dataset.transform = train_transforms
    val_set.dataset.transform = val_transforms
    
    train_loader = DataLoader(train_set, batch_size=batch_size, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_set, batch_size=batch_size, shuffle=False, num_workers=2)
    
    # 3. Model setup
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[Device] Running training on: {device}")
    
    model = MobileNetDiseaseClassifier(num_classes=num_classes)
    model.to(device)
    
    # 4. Criterion and Optimizer
    criterion = nn.CrossEntropyLoss()
    # Fine-tuning: optimize all parameters but use a low learning rate to protect pre-trained weights
    optimizer = optim.Adam(model.parameters(), lr=lr)
    
    best_val_loss = float("inf")
    
    # 5. Training Epoch Loop
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        correct_preds = 0
        total_samples = 0
        
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct_preds += torch.sum(preds == labels.data)
            total_samples += images.size(0)
            
        epoch_loss = running_loss / total_samples
        epoch_acc = correct_preds.double() / total_samples
        
        # Validation pass
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                
                val_loss += loss.item() * images.size(0)
                _, preds = torch.max(outputs, 1)
                val_correct += torch.sum(preds == labels.data)
                val_total += images.size(0)
                
        epoch_val_loss = val_loss / val_total
        epoch_val_acc = val_correct.double() / val_total
        
        print(f"Epoch {epoch+1}/{epochs} | "
              f"Train Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f} | "
              f"Val Loss: {epoch_val_loss:.4f} Acc: {epoch_val_acc:.4f}")
              
        # 6. Save checkpoint if validation loss improves
        if epoch_val_loss < best_val_loss:
            best_val_loss = epoch_val_loss
            checkpoint_path = "disease_model_weights.pth"
            torch.save(model.state_dict(), checkpoint_path)
            print(f" -> Saved best validation weights model checkpoint to '{checkpoint_path}'")
            
    print("[Training Complete] Saved weights successfully!")

if __name__ == "__main__":
    # Example execution: update with path to raw images
    import sys
    dataset_dir = sys.argv[1] if len(sys.argv) > 1 else "./dataset/leaves"
    train_model(dataset_dir, epochs=5)
