FROM node:22-alpine AS web_build
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim AS api
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DATA_DIR=/srv/data
WORKDIR /srv/backend
COPY --from=ghcr.io/astral-sh/uv:0.12.2 /uv /usr/local/bin/uv
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv export --frozen --no-dev --no-emit-project --format requirements-txt -o /tmp/requirements.txt && uv pip install --system --require-hashes -r /tmp/requirements.txt
COPY backend/ ./
COPY data/ /srv/data/
CMD ["sh","-c","python -m alembic upgrade head && exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"]

FROM api AS render
COPY --from=web_build /web/dist/ /srv/frontend/dist/
CMD ["sh","-c","python -m alembic upgrade head && exec python -m uvicorn app.main:app --host 0.0.0.0 --port \"${PORT:-10000}\""]
