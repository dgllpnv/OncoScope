# app/schemas.py
from typing import List, Literal
from pydantic import BaseModel, Field, conlist
from pathlib import Path
import json
import sys

# =========================
# Carrega lista de features selecionadas
# =========================
_selected_features_path = Path(__file__).resolve().parent.parent / "models" / "selected_features.json"

try:
    with open(_selected_features_path, "r", encoding="utf-8") as f:
        _selected_features = json.load(f).get("selected_features", [])
except FileNotFoundError:
    print(f"[ERRO] Arquivo '{_selected_features_path}' não encontrado. Verifique se o modelo foi treinado e salvo.")
    sys.exit(1)

if not _selected_features:
    print(f"[ERRO] Lista de features selecionadas está vazia no arquivo '{_selected_features_path}'.")
    sys.exit(1)

# =========================
# PREDICT
# =========================
class InputData(BaseModel):
    """
    Vetor de features na mesma ordem usada no treino.
    Aceita SOMENTE o número exato de variáveis do modelo treinado
    (definido automaticamente a partir de selected_features.json).
    """
    features: conlist(
        float,
        min_length=len(_selected_features),
        max_length=len(_selected_features)
    ) = Field(
        ...,
        description=f"Lista de {len(_selected_features)} valores numéricos na ordem: {', '.join(_selected_features)}",
        example=[16.1, 25.4, 107.2, 880.7, 0.131, 14.2, 18.3, 92.4, 654.4, 0.181]
    )

class PredictResponse(BaseModel):
    diagnosis: str
    confidence: float


# =========================
# CHAT (LEGADO - uma resposta)
# =========================
class ChatRequest(BaseModel):
    diagnosis: str
    confidence: float

class ChatResponse(BaseModel):
    message: str


# =========================
# CHAT (MULTI-TURNO / RECOMENDADO)
# =========================
class ChatStartRequest(BaseModel):
    """Inicia a conversa a partir do resultado do classificador."""
    diagnosis: str
    confidence: float = Field(..., ge=0.0, le=1.0)

class ChatStartResponse(BaseModel):
    message: str
    thread_id: str

class ChatContinueRequest(BaseModel):
    """Continua a conversa já iniciada (usa o mesmo thread_id)."""
    thread_id: str = Field(..., min_length=6)
    user_text: str = Field(..., min_length=1, max_length=1000)

class ChatContinueResponse(BaseModel):
    reply: str
    thread_id: str


# (Opcional) útil para tipar histórico no frontend, se precisar
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=1000)


# =========================
# METADATA (para expor info do modelo ao frontend)
# =========================
class ModelMetadata(BaseModel):
    selected_features: List[str]
    k: int
    threshold: float
    examples: dict | None = None
