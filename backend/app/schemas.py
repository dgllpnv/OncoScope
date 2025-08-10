from pydantic import BaseModel, Field

# 30 features na ordem do dataset WDBC (mesma ordem usada no treino)
class InputData(BaseModel):
    features: list[float] = Field(
        ...,
        description="Lista de 30 números na ordem do dataset WDBC",
        min_length=30,
        max_length=30,
    )

class PredictResponse(BaseModel):
    diagnosis: str
    confidence: float

class ChatRequest(BaseModel):
    diagnosis: str
    confidence: float

class ChatResponse(BaseModel):
    message: str
