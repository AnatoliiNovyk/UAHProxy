FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (git for Git Auto-Sync, socat for HAProxy socket, ssh client, curl, ping)
RUN apt-get update && apt-get install -y \
    git \
    openssh-client \
    socat \
    curl \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
