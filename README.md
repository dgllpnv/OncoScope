# OncoScope – Classificação (Tech Challenge)

## Visão geral
- Backend: FastAPI servindo o modelo (10 features) + chat de acolhimento.
- Frontend: Angular Material com formulário e resultado.
- Escopo clínico: apoio à decisão; não substitui avaliação médica.

## Requisitos
- Python 3.11+, Node 20+
- Modelo salvo em `models/best_model.pkl`
- `.env` com variáveis (abaixo)

## Configuração
Crie `.env`:
OPENAI_API_KEY=
THRESHOLD=0.5
MALIGNANT_CLASS=1

## Executando
### Backend
pip install -r requirements.txt  # (opcional)
uvicorn app.main:app --reload --port 8000

### Frontend
npm i
npm start  # http://localhost:4200

## Endpoints
GET /health
POST /predict-structured
POST /chat
POST /chat/start
POST /chat/continue

## Exemplo de payload
{ "features": [worst_radius, worst_texture, worst_perimeter, worst_area, worst_smoothness, mean_radius, mean_texture, mean_perimeter, mean_area, mean_concave_points] }

## Estrutura
backend/
  app/main.py, schemas.py, utils.py
  models/selected_features.json, best_model.pkl
frontend/
  src/app/... (Angular 20)

## Observações
- Sem OPENAI_API_KEY, o chat usa respostas de fallback.
- Ajuste CORS/URLs para produção.
- Threshold ajustável via env.

TBD
