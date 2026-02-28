# Songbook — Проектные инструкции

Персональное веб-приложение для гитариста: хранение, просмотр и организация песен с аккордами.

**Сервер:** `ssh wbcc`, проект `/opt/songbook`
**Домен:** `abbsongs.duckdns.org` (DuckDNS, IP: 185.221.213.215)
**GitHub:** https://github.com/abb1303516/songbook
**Деплой:** `git push` → `ssh wbcc "cd /opt/songbook && git pull && docker compose up -d --build"`

## Стек

| Слой | Технология |
|------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Роутинг | React Router v7 |
| Color picker | react-colorful |
| Backend | Node.js + Express |
| БД | PostgreSQL 15 |
| DB-клиент | pg (node-postgres), raw SQL |
| Reverse proxy | Caddy (автоматический SSL) |
| Домен | DuckDNS (бесплатный поддомен) |

## Архитектура

- **Публичный фронтенд** — просмотр песен, сет-листов, настройки отображения
- **Админка** (`/admin`) — редактирование песен, сет-листов, импорт. Защита: URL + пароль (env `ADMIN_PASSWORD`, заголовок `X-Admin-Password`)
- **Персональные настройки** — в localStorage (транспонирование, шрифт, цвета, тема)
- **Данные песен** — в PostgreSQL (title, artist, key, chordpro, tags)
- **Формат песен** — ChordPro (аккорды в [квадратных скобках])

## Структура проекта

```
client/                  # React + Vite
  src/
    api/                 # fetch-обёртки для API
    utils/               # ChordPro парсер, транспонирование
    hooks/               # useLocalSettings, useAutoScroll
    context/             # SettingsContext (тема, цвета)
    components/          # UI-компоненты
    pages/               # Страницы (SongList, SongView, Admin, etc.)

server/                  # Node.js + Express
  src/
    routes/              # API endpoints (songs, setlists, import, export, admin)
    db/
      pool.js            # pg Pool
      migrations/        # SQL файлы

caddy/                   # Caddyfile для reverse proxy + SSL
```

## API

```
GET    /api/songs                  # Все песни
GET    /api/songs/:id              # Одна песня
POST   /api/songs          [admin] # Создать
PUT    /api/songs/:id       [admin] # Обновить
DELETE /api/songs/:id       [admin] # Удалить

GET    /api/setlists               # Все сет-листы
GET    /api/setlists/:id           # Один сет-лист с песнями
POST   /api/setlists       [admin] # Создать
PUT    /api/setlists/:id    [admin] # Обновить
DELETE /api/setlists/:id    [admin] # Удалить

POST   /api/import          [admin] # Импорт ChordPro
GET    /api/export                  # Экспорт всех песен
POST   /api/admin/verify           # Проверить пароль
```

## Docker

**Контейнеры:** songbook_postgres (:5450), songbook_server (:3001), songbook_client (:3080)

Все сервисы на 127.0.0.1. Внешний доступ через хостовый nginx + certbot SSL.

**Файлы:** `docker-compose.yml` + `.env` (секреты, НЕ в git). Шаблон: `.env.example`

## БД

```sql
songs    (id, title, artist, key, chordpro, tags[], sort_order, created_at, updated_at)
setlists (id, name, song_ids[], created_at, updated_at)
```

## Роутинг (URL)

```
/                    → Список песен + поиск + теги + вкладка сет-листов
/song/:id            → Просмотр песни (транспонирование, fit-to-screen, автопрокрутка)
/setlist/:id         → Сет-лист с навигацией prev/next
/settings            → Персональные настройки (темы, цвета, шрифт)
/admin               → Вход по паролю
/admin/songs/new     → Новая песня
/admin/songs/:id     → Редактирование песни
/admin/setlists/new  → Новый сет-лист
/admin/setlists/:id  → Редактирование сет-листа
/admin/import        → Импорт ChordPro
```

## Конвенции

- Миграции: `server/src/db/migrations/NNN-description.sql`
- Язык интерфейса: русский
- ID: текстовые (timestamp + random)
- Формат данных: ChordPro. Секции: `{sov}/{eov}`, `{soc}/{eoc}`, `{sob}/{eob}`
- Git: main (стабильная) + dev (разработка)

## Статус реализации

| Функция | Статус |
|---------|--------|
| Список песен с поиском и тегами | Готово |
| Просмотр песни с аккордами | Готово |
| Транспонирование | Готово |
| Автопрокрутка | Готово |
| Fit-to-screen (кнопка + ползунки) | Готово |
| Скрытие/показ аккордов | Готово |
| Сет-листы с навигацией | Готово |
| 4 темы-пресета + color picker | Готово |
| Размер шрифта, интервал, моно | Готово |
| Админка (пароль) | Готово |
| Редактор песни (ChordPro + превью) | Готово |
| Редактор сет-листа | Готово |
| Импорт ChordPro (файл/текст) | Готово |
| Экспорт коллекции | Готово |
| Backend API (CRUD) | Готово |
| Docker (3 контейнера) | Готово |
| Деплой на сервер | Готово |
| DuckDNS + nginx SSL (certbot) | Готово |
