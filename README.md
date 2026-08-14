# UAProxy Premium (100% Functional Roxy-WI Premium Alternative)

**UAProxy** — сучасна веб-панель управління інфраструктурою балансування навантаження та високої доступності (**HAProxy**, **Nginx**, **Apache**, **Keepalived**).

Сучасний FullStack клон Roxy-WI Premium на стеку **FastAPI (Python 3.12) + Async SQLAlchemy + PostgreSQL + React + Vite + Tailwind CSS + WebSockets**.

---

## 🚀 Основний функціонал (Feature-Parity Roxy-WI Premium)

- **Керування Сервісами**: 1-Click встановлення та оновлення HAProxy, Nginx, Apache, Keepalived та Prometheus Exporters.
- **Шифрування SSH & Безпека**: Fernet (AES-256) шифрування приватних ключів та паролів до серверів, RBAC (Admin, Manager, Viewer, HideBlock), JWT авторизація.
- **Config Studio**: Редактор з перевіркою синтаксису (`haproxy -c`, `nginx -t`), side-by-side Diff, історія версій, rollback та автоматична Git-синхронізація.
- **HAProxy Runtime Socket API**: Динамічне увімкнення/вимкнення серверів (Ready, Drain, Maintain) та зміна вагових коефіцієнтів без рестарту.
- **SMON Monitoring**: Синтетичний моніторинг HTTP, PING, TCP та перевірка строків дії SSL сертифікатів. Публічна сторінка статусу.
- **High-Availability Кластери**: Налаштування Keepalived VRRP кластерів, Virtual IP та Master-Slave синхронізації.
- **Алерти та Аудит**: Сповіщення в Telegram, Slack, Webhooks + повний Audit Log дій користувачів.
- **Двомовність (i18n)**: Повна українська та англійська локалізація з перемикачем у один клік.

---

## 🛠️ Запуск через Docker Compose

```bash
# Клонуйте або відкрийте директорію проекту
cd uaproxy

# Скопіюйте конфігурацію середовища
cp .env.example .env

# Запустіть весь стек (PostgreSQL + Redis + FastAPI + React UI)
docker compose up -d --build
```

Доступ до інтерфейсів:
- **Web Interface**: `http://localhost:3000` (або `http://localhost`)
- **FastAPI OpenAPI Docs**: `http://localhost:8000/docs`
- **Initial Login**: `admin` / `admin123`

---

## 🏗️ Структура Проекту

```
uaproxy/
├── docker-compose.yml
├── backend/                  # FastAPI Async API & SSH Engine
│   ├── app/
│   │   ├── api/             # REST Endpoints
│   │   ├── core/            # Config, Security (Fernet), DB engine
│   │   ├── models/          # SQLAlchemy ORM Models
│   │   ├── schemas/         # Pydantic Schemas
│   │   ├── services/        # AsyncSSH, HAProxy Socket, SMON Checker
│   │   └── websockets/      # Realtime Live Streaming WS
│   └── Dockerfile
└── frontend/                 # React + TypeScript + Vite + Tailwind UI
    ├── src/
    │   ├── components/      # UI Layout & Navbar
    │   ├── views/           # Dashboard, Servers, Configs, SMON, Clusters, Alerts
    │   ├── i18n/            # Ukrainian & English Translations
    │   └── services/        # Axios API & WebSocket connector
    └── Dockerfile
```
