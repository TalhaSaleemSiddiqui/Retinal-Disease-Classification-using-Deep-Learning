import os
import shutil
import random

# SETTINGS
source_dir = './dataset'          
output_dir = './dataset_split'    
train_ratio = 0.8
val_ratio = 0.1
test_ratio = 0.1                  
seed = 42                      


random.seed(seed)

classes = sorted(os.listdir(source_dir))
classes = [c for c in classes if os.path.isdir(os.path.join(source_dir, c))]
print(f"Classes found: {classes}")

for split in ['train', 'val', 'test']:
    for cls in classes:
        os.makedirs(os.path.join(output_dir, split, cls), exist_ok=True)

for cls in classes:
    cls_folder = os.path.join(source_dir, cls)
    images = sorted([f for f in os.listdir(cls_folder) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
    random.shuffle(images)

    total = len(images)
    train_end = int(train_ratio * total)
    val_end = train_end + int(val_ratio * total)

    train_files = images[:train_end]
    val_files = images[train_end:val_end]
    test_files = images[val_end:]

    for f in train_files:
        shutil.copy(os.path.join(cls_folder, f), os.path.join(output_dir, 'train', cls, f))
    for f in val_files:
        shutil.copy(os.path.join(cls_folder, f), os.path.join(output_dir, 'val', cls, f))
    for f in test_files:
        shutil.copy(os.path.join(cls_folder, f), os.path.join(output_dir, 'test', cls, f))

    print(f"{cls}: Total={total} | Train={len(train_files)} | Val={len(val_files)} | Test={len(test_files)}")

print(f"\nDone! The train/val/test folders have been created separately inside the '{output_dir}' folder.")