FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --legacy-peer-deps
COPY frontend ./frontend
ARG REACT_APP_BACKEND_URL=.
ARG REACT_APP_LOCAL_AUTH=false
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV REACT_APP_LOCAL_AUTH=$REACT_APP_LOCAL_AUTH
RUN cd frontend && npm run build

FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend ./backend
COPY --from=frontend-build /app/frontend/build ./frontend/build
EXPOSE 8000
CMD ["sh", "-c", "cd backend && uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]
