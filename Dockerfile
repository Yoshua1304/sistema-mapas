# --- ETAPA 1: Construir el Frontend (React + Vite) ---
FROM node:20-slim AS frontend-build
WORKDIR /app-frontend
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- ETAPA 2: Configurar el Backend (Python) ---
FROM python:3.11-slim-bookworm

# (Tus configuraciones de seguridad y SQL Server que ya funcionan)
RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources \
 && sed -i 's|http://security.debian.org|https://security.debian.org|g' /etc/apt/sources.list.d/debian.sources

RUN apt-get update && apt-get install -y \
    curl gnupg unixodbc unixodbc-dev gcc g++ ca-certificates && rm -rf /var/lib/apt/lists/*

RUN curl -sSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /usr/share/keyrings/microsoft.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" \
    > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update && ACCEPT_EULA=Y apt-get install -y msodbcsql18 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos todo el código fuente
COPY . .

# ✅ CLAVE: Traemos la carpeta 'dist' (el frontend compilado) desde la etapa de Node
COPY --from=frontend-build /app-frontend/dist ./dist

EXPOSE 5001

# Ejecutamos el backend
CMD ["python", "app.py"]