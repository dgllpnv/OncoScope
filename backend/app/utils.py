import os
import math
from pathlib import Path
from typing import Tuple, List, Optional

import joblib
import pandas as pd
from dotenv import load_dotenv

# Carrega variáveis do .env (THRESHOLD, OPENAI_API_KEY, etc.)
load_dotenv()

# Caminhos
BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = BASE_DIR / "models" / "best_model.pkl"

# Threshold de decisão (padrão 0.5)
THRESHOLD = float(os.getenv("THRESHOLD", "0.5"))

# Ordem "canônica" das 30 features do WDBC (ajuste se seu treino usou outra ordem)
FEATURES_ORDER = [
    "mean radius","mean texture","mean perimeter","mean area","mean smoothness",
    "mean compactness","mean concavity","mean concave points","mean symmetry",
    "mean fractal dimension","radius error","texture error","perimeter error",
    "area error","smoothness error","compactness error","concavity error",
    "concave points error","symmetry error","fractal dimension error","worst radius",
    "worst texture","worst perimeter","worst area","worst smoothness",
    "worst compactness","worst concavity","worst concave points",
    "worst symmetry","worst fractal dimension"
]

# Cache do modelo
_model = None


def load_model():
    """Carrega o .pkl uma única vez e mantém em cache."""
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Modelo não encontrado em: {MODEL_PATH}")
        _model = joblib.load(MODEL_PATH)
    return _model


# ---------- Helpers para descobrir o que o modelo espera ----------

def _expected_feature_names(model) -> Optional[List[str]]:
    """
    Tenta obter os nomes de features que o modelo viu no treino.
    Procura em model.feature_names_in_ e, se for Pipeline, dentro dos steps.
    """
    names = getattr(model, "feature_names_in_", None)
    if names is not None:
        return list(names)

    # Evita dependência direta de sklearn.Pipeline
    steps = getattr(model, "steps", None)
    if steps:
        for _, step in steps:
            names = getattr(step, "feature_names_in_", None)
            if names is not None:
                return list(names)

    return None


def _expected_n_features(model) -> Optional[int]:
    """
    Descobre quantas features o modelo espera.
    Prioriza n_features_in_, senão tenta pelo tamanho de feature_names_in_.
    """
    n = getattr(model, "n_features_in_", None)
    if n is not None:
        return int(n)

    names = _expected_feature_names(model)
    if names is not None:
        return len(names)

    return None


# ---------- Predição estruturada ----------

def predict_structured(features: List[float]) -> Tuple[str, float]:
    """
    Recebe 30 floats (WDBC), monta um DataFrame compatível com o que o modelo espera
    e retorna (diagnóstico, confiança).
    - Se o modelo tiver sido treinado com uma coluna extra (ex.: id), preenche NaN
      para o SimpleImputer tratar.
    """
    model = load_model()

    expected_names = _expected_feature_names(model)
    expected_n = _expected_n_features(model)

    if expected_names:
        # Mapeia pela *nomeação* que o modelo conhece (mais seguro para ColumnTransformer/Pipelines)
        data = {}
        for name in expected_names:
            if name in FEATURES_ORDER:
                idx = FEATURES_ORDER.index(name)
                data[name] = float(features[idx])
            else:
                # Coluna que não está nas 30 "oficiais" -> deixa NaN para o Imputer
                data[name] = math.nan
        X = pd.DataFrame([data], columns=expected_names)

    else:
        # Sem nomes conhecidos. Vamos pelo número esperado de colunas.
        if expected_n is None:
            # Último recurso: assume 30
            expected_n = len(FEATURES_ORDER)

        if expected_n == len(FEATURES_ORDER):
            # 30 -> usa as 30 features na ordem canônica
            X = pd.DataFrame([features], columns=FEATURES_ORDER)

        elif expected_n == len(FEATURES_ORDER) + 1 and len(features) == 30:
            # Modelo espera 31, recebemos 30 -> adiciona 1 NaN (provável 'id' perdido)
            vals = list(map(float, features)) + [math.nan]
            cols = FEATURES_ORDER + ["_extra"]
            X = pd.DataFrame([vals], columns=cols)
        else:
            raise ValueError(
                f"Modelo espera {expected_n} features, mas recebi {len(features)}. "
                "Ajuste o mapeamento ou re-treine removendo colunas extras."
            )

    # Predição
    if hasattr(model, "predict_proba"):
        proba_maligno = float(model.predict_proba(X)[0][1])
        label = "Maligno" if proba_maligno >= THRESHOLD else "Benigno"
        confidence = proba_maligno if label == "Maligno" else 1.0 - proba_maligno
        return label, confidence

    # Fallback para modelos sem predict_proba
    pred = int(model.predict(X)[0])
    label = "Maligno" if pred == 1 else "Benigno"
    return label, 0.5  # confiança neutra se não há probabilidade


# ---------- Chatbot (OpenAI com fallback) ----------

def _openai_client():
    """
    Retorna cliente OpenAI (lib v1.x). Se não houver API key, retorna None.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=api_key)
    except Exception:
        return None


def chat_with_user(diagnosis: str, confidence: float) -> str:
    """
    Mensagem curta e empática com base no diagnóstico.
    Se não houver chave da OpenAI, usa fallback local.
    """
    base_msg = (
        f"Resultado do modelo: {diagnosis} (confiança {confidence:.2%}). "
        "Isto é apoio à decisão e não substitui avaliação médica. "
    )

    client = _openai_client()
    if client is None:
        if diagnosis.lower() == "maligno":
            return base_msg + "Procure seu médico o quanto antes. Você não está sozinho(a); estamos aqui para ajudar."
        return base_msg + "O resultado sugere baixo risco. Mantenha acompanhamento e exames em dia."

    prompt = (
        f"Diagnóstico do classificador: '{diagnosis}' (confiança {confidence:.2%}). "
        "Escreva uma mensagem curta (máx. 60 palavras), empática, sem termos técnicos difíceis, "
        "reforçando que a pessoa deve procurar um médico para orientação."
    )

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Você é um assistente de saúde empático e responsável. Irá dar mensagens de apoio somente, e SEMPRE deve indicar procurar um médico, SEMPRE!"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return base_msg + "Nosso assistente virtual está indisponível no momento. Consulte seu médico para orientação."
