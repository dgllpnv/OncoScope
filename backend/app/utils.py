import os
import re
import math
import uuid
import json
from pathlib import Path
from typing import Tuple, List, Optional, Dict, Any

import joblib
import pandas as pd
from dotenv import load_dotenv

# ------------------ ENV & Caminhos ------------------
load_dotenv()

BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = BASE_DIR / "models" / "best_model.pkl"
SELECTED_FEATURES_PATH = BASE_DIR / "models" / "selected_features.json"

THRESHOLD = float(os.getenv("THRESHOLD", "0.5"))
MALIGNANT_CLASS = os.getenv("MALIGNANT_CLASS", "1").strip()

# Carrega TOP10_FEATURES dinamicamente do JSON
if SELECTED_FEATURES_PATH.exists():
    try:
        with open(SELECTED_FEATURES_PATH, "r", encoding="utf-8") as f:
            TOP10_FEATURES = json.load(f).get("selected_features", [])
        if not TOP10_FEATURES:
            raise RuntimeError(f"O arquivo {SELECTED_FEATURES_PATH} não contém 'selected_features'.")
        print(f"[OncoScope] TOP10_FEATURES carregadas: {TOP10_FEATURES}")
    except Exception as e:
        raise RuntimeError(f"Erro ao ler {SELECTED_FEATURES_PATH}: {e}")
else:
    raise FileNotFoundError(f"Arquivo {SELECTED_FEATURES_PATH} não encontrado. Treine o modelo antes.")

# Ordem original das 30 features
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

# ------------------ Modelo (cache) ------------------
_model = None

def load_model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Modelo não encontrado em: {MODEL_PATH}")
        _model = joblib.load(MODEL_PATH)
    return _model

# ------------------ Helpers ------------------
_SPLIT = re.compile(r"[\s_\-/():]+", re.UNICODE)

def _canon(name: str) -> tuple:
    toks = [t for t in _SPLIT.split(str(name).lower()) if t]
    return tuple(sorted(toks))

CANON_MAP = { _canon(k): k for k in FEATURES_ORDER + TOP10_FEATURES }
LIKELY_EXTRA = {"id", "index", "idx", "diagnosis", "target", "label", "class"}

def _expected_feature_names(model) -> Optional[List[str]]:
    names = getattr(model, "feature_names_in_", None)
    if names is not None:
        return list(names)
    steps = getattr(model, "steps", None)
    if steps:
        for _, step in steps:
            names = getattr(step, "feature_names_in_", None)
            if names is not None:
                return list(names)
    return None

def _expected_n_features(model) -> Optional[int]:
    n = getattr(model, "n_features_in_", None)
    if n is not None:
        return int(n)
    names = _expected_feature_names(model)
    return len(names) if names is not None else None

def _get_estimator_with_proba(model):
    if hasattr(model, "predict_proba"):
        return model
    steps = getattr(model, "steps", None)
    if steps:
        for _, step in reversed(steps):
            if hasattr(step, "predict_proba"):
                return step
    return model

def _malignant_index(classes) -> int:
    env = MALIGNANT_CLASS.lower()
    try:
        cls = list(classes)
    except Exception:
        cls = None
    print(f"[OncoScope] classes_ do estimador final: {cls}")
    if cls is not None:
        for i, c in enumerate(cls):
            if str(c).lower() in {env, "m", "maligno", "malignant", "1", "true"}:
                return i
        if len(cls) == 2:
            for i, c in enumerate(cls):
                if str(c).lower() in {"b", "benigno", "benign", "0", "false"}:
                    return 1 - i
        return len(cls) - 1
    return 1

def _proba_maligno(model, X) -> float:
    est = _get_estimator_with_proba(model)
    proba = est.predict_proba(X)[0]
    idx = _malignant_index(getattr(est, "classes_", None))
    return float(proba[idx])

def _build_X(features: List[float], model) -> pd.DataFrame:
    expected_names = _expected_feature_names(model)
    expected_n = _expected_n_features(model)

    print(f"[OncoScope] Recebidas {len(features)} features: {features}")

    if len(features) != len(TOP10_FEATURES):
        raise ValueError(f"Número incorreto de variáveis. Esperado {len(TOP10_FEATURES)}, recebi {len(features)}.")

    if expected_names:
        matched = 0
        data = {}
        missing = []
        # Criar mapa de nome → índice baseado no TOP10_FEATURES
        top10_index_map = {name: idx for idx, name in enumerate(TOP10_FEATURES)}

        for name in expected_names:
            key = _canon(name)
            if any(tok in LIKELY_EXTRA for tok in key):
                data[name] = math.nan
                continue
            if key in CANON_MAP:
                ref_name = CANON_MAP[key]
                if ref_name in top10_index_map:
                    idx = top10_index_map[ref_name]
                    data[name] = float(features[idx])
                    matched += 1
                else:
                    # Caso a coluna não esteja nas top10, preenche com NaN
                    data[name] = math.nan
                    missing.append(name)
            else:
                data[name] = math.nan
                missing.append(name)
        print(f"[OncoScope] colunas esperadas: {len(expected_names)} | casadas: {matched} | faltando: {len(missing)}")
        if missing:
            print(f"[OncoScope] Faltando mapear: {missing}")
        return pd.DataFrame([data], columns=expected_names)

    # Caso não tenha nomes, usa apenas as top10
    if expected_n == len(TOP10_FEATURES):
        return pd.DataFrame([features], columns=TOP10_FEATURES)

    if expected_n == len(FEATURES_ORDER):
        return pd.DataFrame([features], columns=FEATURES_ORDER)

    raise ValueError(f"Modelo espera {expected_n} features, mas recebi {len(features)}.")

# ------------------ Predição ------------------
def predict_structured(features: List[float]) -> Tuple[str, float]:
    model = load_model()
    X = _build_X(features, model)
    est = _get_estimator_with_proba(model)
    if hasattr(est, "predict_proba"):
        proba_maligno = _proba_maligno(model, X)
        label = "Maligno" if proba_maligno >= THRESHOLD else "Benigno"
        confidence = proba_maligno if label == "Maligno" else 1.0 - proba_maligno
        return label, confidence
    pred = int(model.predict(X)[0])
    label = "Maligno" if pred == 1 else "Benigno"
    return label, 0.5

# ------------------ OpenAI helper ------------------
def _openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=api_key)
    except Exception:
        return None

# ------------------ Chat ------------------
def chat_with_user(diagnosis: str, confidence: float) -> str:
    base_msg = (
        f"Resultado do modelo: {diagnosis} (confiança {confidence:.2%}). "
        "Isto é apoio à decisão e não substitui avaliação médica. "
    )
    client = _openai_client()
    if client is None:
        if diagnosis.lower() == "maligno":
            return base_msg + (
                "Entendo que isso possa gerar preocupação. Busque um médico especialista o quanto antes "
                "e, se precisar, procure apoio psicológico. Você não está sozinho(a)."
            )
        return base_msg + (
            "O resultado sugere baixo risco. Mantenha seus exames em dia e converse com seu médico para acompanhamento."
        )
    prompt = (
        f"Diagnóstico do classificador: '{diagnosis}' (confiança {confidence:.2%}). "
        "Escreva uma mensagem curta (até 60 palavras), acolhedora, sem jargões, "
        "reforçando procurar médico/apoio psicológico e evitando aconselhamento clínico específico."
    )
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _system_prompt(diagnosis, confidence)},
                {"role": "user", "content": prompt},
            ],
            temperature=0.6,
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return base_msg + "Nosso assistente está indisponível no momento. Procure um médico para orientação."

_THREADS: Dict[str, Dict[str, Any]] = {}

def _system_prompt(diagnosis: str, confidence: float) -> str:
    return (
        "Você é um assistente de acolhimento emocional, gentil e responsável. "
        "Escopo estrito: falar apenas sobre cuidado com a saúde, acolhimento emocional, "
        "buscar um médico especialista e opções de apoio psicológico. "
        "NÃO forneça diagnósticos, tratamentos, doses ou interpretações de exame. "
        f"Contexto do modelo: diagnóstico='{diagnosis}', confiança={confidence:.2%}. "
        "Estilo: linguagem simples, empática, 50–80 palavras."
    )

def _first_message_offline(diagnosis: str, confidence: float) -> str:
    if diagnosis.lower() == "maligno":
        return (
            f"Resultado do modelo: {diagnosis} (confiança {confidence:.2%}). "
            "Procure um médico especialista e apoio psicológico. Você não está sozinho(a)."
        )
    return (
        f"Resultado do modelo: {diagnosis} (confiança {confidence:.2%}). "
        "Tendência de baixo risco, mas mantenha acompanhamento médico."
    )

def _reply_offline(user_text: str) -> str:
    return (
        "Entendo o que você compartilhou. Procure um médico especialista e, se necessário, apoio psicológico."
    )

def chat_start(diagnosis: str, confidence: float) -> Tuple[str, str]:
    thread_id = uuid.uuid4().hex
    sys = _system_prompt(diagnosis, confidence)
    client = _openai_client()
    if client is None:
        first = _first_message_offline(diagnosis, confidence)
    else:
        try:
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": sys},
                    {"role": "user", "content": "Gere uma primeira mensagem de acolhimento."},
                ],
                temperature=0.6,
            )
            first = resp.choices[0].message.content.strip()
        except Exception:
            first = _first_message_offline(diagnosis, confidence)
    _THREADS[thread_id] = {
        "diagnosis": diagnosis,
        "confidence": confidence,
        "system": sys,
        "messages": [
            {"role": "system", "content": sys},
            {"role": "assistant", "content": first},
        ],
    }
    return first, thread_id

def chat_continue(thread_id: str, user_text: str) -> Tuple[str, str]:
    if thread_id not in _THREADS:
        raise KeyError("thread_id inexistente")
    state = _THREADS[thread_id]
    state["messages"].append({"role": "user", "content": user_text})
    client = _openai_client()
    if client is None:
        reply = _reply_offline(user_text)
    else:
        try:
            history = state["messages"]
            pruned = [history[0]] + history[-10:]
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=pruned,
                temperature=0.5,
            )
            reply = resp.choices[0].message.content.strip()
        except Exception:
            reply = _reply_offline(user_text)
    state["messages"].append({"role": "assistant", "content": reply})
    return reply, thread_id
