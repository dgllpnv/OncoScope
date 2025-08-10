# app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import (
    # Predict
    InputData, PredictResponse,
    # Chat legado (uma resposta)
    ChatRequest, ChatResponse,
    # Chat multi-turno
    ChatStartRequest, ChatStartResponse,
    ChatContinueRequest, ChatContinueResponse,
)
from app.utils import (
    predict_structured,
    # legado
    chat_with_user,
    # multi-turno
    chat_start,
    chat_continue,
)

import traceback

app = FastAPI(
    debug=True,
    title="OncoScope API (Dia 3-4)",
    version="1.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------- CORS ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # em produção, restrinja ao domínio do front
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Health ----------
@app.get("/health", tags=["system"])
def health():
    return {"status": "ok"}

# ---------- Predição estruturada ----------
@app.post("/predict-structured", response_model=PredictResponse, tags=["predict"])
def predict(data: InputData):
    """
    Recebe as features selecionadas (TOP10_FEATURES) e devolve diagnóstico + confiança.
    """
    try:
        print(f"[OncoScope] Recebido no /predict-structured: {data.features}")
        label, conf = predict_structured(data.features)
        print(f"[OncoScope] Resultado -> Diagnóstico: {label} | Confiança: {conf:.4f}")
        return PredictResponse(diagnosis=label, confidence=conf)
    except FileNotFoundError as e:
        # Modelo ausente
        print(f"[OncoScope] ERRO 503 - {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        # Mismatch de features etc.
        print(f"[OncoScope] ERRO 400 - {e}")
        raise HTTPException(status_code=400, detail=f"Entrada inválida: {e}")
    except Exception as e:
        print("[OncoScope] ERRO 500 inesperado:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao prever: {e}")

# ---------- Chat (LEGADO: uma resposta única) ----------
@app.post("/chat", response_model=ChatResponse, tags=["chat (legado)"])
def chat(req: ChatRequest):
    """
    Gera uma mensagem única de acolhimento (modo legado).
    """
    try:
        print(f"[OncoScope] Chat legado iniciado - Diagnóstico: {req.diagnosis} | Confiança: {req.confidence}")
        message = chat_with_user(req.diagnosis, req.confidence)
        return ChatResponse(message=message)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro no chat: {e}")

# ---------- Chat (MULTI-TURNO) ----------
@app.post("/chat/start", response_model=ChatStartResponse, tags=["chat"])
def chat_start_endpoint(req: ChatStartRequest):
    """
    Inicia o diálogo de acolhimento (gera 1ª mensagem e um thread_id).
    Escopo estrito: apoio emocional, buscar médico/apoio psicológico.
    """
    try:
        print(f"[OncoScope] Chat multi-turno iniciado - Diagnóstico: {req.diagnosis} | Confiança: {req.confidence}")
        message, thread_id = chat_start(req.diagnosis, req.confidence)
        return ChatStartResponse(message=message, thread_id=thread_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao iniciar chat: {e}")

@app.post("/chat/continue", response_model=ChatContinueResponse, tags=["chat"])
def chat_continue_endpoint(req: ChatContinueRequest):
    """
    Continua a conversa na mesma thread (thread_id).
    Escopo restrito a saúde/acolhimento; evita outros assuntos.
    """
    try:
        print(f"[OncoScope] Chat continua - Thread: {req.thread_id} | Texto do usuário: {req.user_text}")
        reply, thread_id = chat_continue(req.thread_id, req.user_text)
        return ChatContinueResponse(reply=reply, thread_id=thread_id)
    except KeyError:
        # thread_id inexistente/expirado
        print(f"[OncoScope] Thread {req.thread_id} não encontrada ou expirada.")
        raise HTTPException(status_code=404, detail="Thread não encontrada ou expirada.")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro no chat (multi-turno): {e}")
