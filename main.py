from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


device = torch.device("cpu")


model = models.resnet18(weights=None)
model.fc = nn.Linear(model.fc.in_features, 4)


model.load_state_dict(torch.load('best_retinal_model.pth', map_location=device))
model.to(device)
model.eval()  

classes = ['Cataract', 'Diabetic Retinopathy', 'Glaucoma', 'Normal']


transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])


@app.get("/")
async def root():
    
    return {"status": "Backend is running", "classes": classes}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    print(f"\n--- New Request: {file.filename} ---")

    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        
        return {"error": f"Invalid image file: {str(e)}"}

    input_tensor = transform(image).unsqueeze(0).to(device)

    
    print(f"Image Tensor Sum: {input_tensor.sum().item():.2f}")

    with torch.no_grad():
        outputs = model(input_tensor)

    print(f"Raw Model Output: {outputs[0].tolist()}")

    probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
    conf, predicted = torch.max(probabilities, 0)

    predicted_class = classes[predicted.item()]
    confidence_score = round(conf.item() * 100, 2)

    print(f"Prediction: {predicted_class} ({confidence_score}%)")

    return {
        "prediction": predicted_class,
        "confidence": f"{confidence_score}%"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)