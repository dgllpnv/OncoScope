from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import InputData, PredictResponse, ChatRequest, ChatResponse
from app.utils import predict_structured, chat_with_user

app = FastAPI(title="OncoScope API (Dia 3)", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # em produção, restrinja para o domínio do front
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict-structured", response_model=PredictResponse)
def predict(data: InputData):
    try:
        label, conf = predict_structured(data.features)
        return PredictResponse(diagnosis=label, confidence=conf)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao prever: {e}")

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    try:
        message = chat_with_user(req.diagnosis, req.confidence)
        return ChatResponse(message=message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no chat: {e}")
