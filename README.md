# Urban Services & eGov — MVP (Expo + optional backend)

MVP мобильного приложения «Единая цифровая экосистема управления городским хозяйством и обращениями граждан».

Режимы работы:
- **Frontend-only**: все данные mock (in-memory через Zustand)
- **С backend**: frontend подключается к REST API (JWT + MongoDB) без изменения структуры экранов

Фокус: архитектура, UX, навигация, состояние, масштабируемость.

## Запуск

```bash
npm install
npx expo start
```

### Подключение к backend (REST)

1) Поднять backend в [backend](backend) (инструкция: [backend/README.md](backend/README.md))

2) Указать URL API для Expo:

- Windows/macOS/Linux:
	- `EXPO_PUBLIC_API_URL=http://localhost:3000`

Примечания:
- Android Emulator: вместо `localhost` часто нужен `http://10.0.2.2:3000`
- Реальное устройство: используйте IP вашего ПК в локальной сети (например `http://192.168.0.10:3000`)

## Архитектура

Роутинг — Expo Router, разбиение по ролям через route groups:
- app/(auth) — заглушка «Digital ID (eGov)» + выбор роли
- app/(citizen) — «Активный житель»: подача заявки, список, детали
- app/(worker) — «Полевой сотрудник»: рабочий лист, выполнение задачи
- app/(admin) — «Контроль и аналитика»: диспетчер (назначение), дашборд

Структура (production-like):
- components/ — переиспользуемые UI блоки (чистый RN)
- store/ — единый Zustand store
- types/ — доменная типизация (Request, Worker, роли, статусы)
- mock/ — seed-данные
- constants/ — доменные константы (SLA, статусы, категории)
- hooks/, utils/ — небольшие утилиты

## Состояние и логика (без backend)

Единый store хранит:
- users/role (mock-login)
- requests + workers
- gamification points

Жизненный цикл заявки (из ТЗ):
Принято → Назначен → В работе → Выполнено

SLA:
- если заявка в статусе «В работе» дольше N минут — пометка «Просрочено»

Геймификация (concept):
- баллы начисляются за подтвержденные заявки
- badge «Активный житель» при достижении порога

## Как масштабировать под backend (концептуально)

1) Вынести side-effects из UI:
- добавить слой features/*/api (например, features/requests/api.ts)
- заменить store actions на async-экшены с репозиторием

2) Типы и контракты уже готовы:
- types/domain.ts может стать единой source-of-truth для DTO + UI-моделей

3) Изоляция моков:
- mock/seed.ts можно заменить на загрузку из API (REST/GraphQL) без смены экранов

4) Синхронизация и оффлайн:
- сохранить Zustand store, добавить persist (AsyncStorage) и очередь действий (outbox)
