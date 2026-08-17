FROM node:22-alpine

WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --legacy-peer-deps
COPY frontend ./frontend
RUN cd frontend && npm run build
RUN npm install --global serve@14.2.4

ENV HOST=0.0.0.0
CMD ["sh", "-c", "serve -s frontend/build -l tcp://0.0.0.0:${PORT:-3000}"]
