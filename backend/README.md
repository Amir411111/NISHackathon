# Urban Services Backend (Express + MongoDB)

Отдельный backend-проект для существующего Expo-frontend.

## Стек
- Node.js + Express
- MongoDB + Mongoose
- JWT auth + роли (citizen/worker/admin)
- bcrypt
- multer (multipart/form-data, сохранение файлов в `uploads/`)
- dotenv

## Быстрый старт

1) Установить зависимости

```bash
cd backend
npm install
```

2) Создать `.env`

Скопируйте `.env.example` → `.env` и заполните значения.

Важно:
- Секреты НЕ коммитим
- Подключение к MongoDB выполняется строго через `mongoose.connect(process.env.MONGODB_URI)` (см. `src/server.js`)

3) Запуск

```bash
npm run dev
```

Проверка:
- `GET http://localhost:3000/health` → `{ ok: true }`
- Загруженные фото будут доступны по `http://localhost:3000/uploads/<file>`

## API (под текущие экраны)

### Auth
- `POST /auth/register` { email, password, role }
- `POST /auth/login` { email, password }

### Citizen
- `POST /requests` (multipart: before[], поля category/description/priority/lat/lng)
- `GET /requests/my`
- `POST /requests/:id/confirm`
- `POST /requests/:id/reject`
- `POST /categories`
- `GET /categories`

### Worker
- `GET /tasks`
- `POST /tasks/:id/start`
- `POST /tasks/:id/complete` (multipart: after[])

### Admin
- `GET /requests`
- `POST /requests/:id/assign` { workerId }
- `GET /analytics/summary`

## Примечания
- SLA рассчитывается при создании заявки (`priority` влияет на дедлайн)
- `isOverdue` пересчитывается при выдаче списков задач/заявок
