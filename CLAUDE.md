# AB Songbook — Проектные инструкции

Персональное веб-приложение для гитариста: хранение, просмотр и организация песен с аккордами.

**Сервер:** `ssh wbcc`, проект `/opt/songbook`
**Домен:** `abbsongs.duckdns.org` (DuckDNS, IP: 185.221.213.215)
**GitHub:** https://github.com/abb1303516/songbook
**Деплой:** `git push` → `ssh wbcc "cd /opt/songbook && git pull && docker compose up -d --build"`

## Стек

| Слой | Технология |
|------|-----------|
| Frontend | React + Vite + Tailwind CSS v4 |
| Роутинг | React Router v7 |
| Color picker | react-colorful |
| Backend | Node.js + Express |
| БД | PostgreSQL 15 |
| DB-клиент | pg (node-postgres), raw SQL |
| Reverse proxy | nginx + certbot SSL |
| Домен | DuckDNS (бесплатный поддомен) |

## Архитектура

- **Sidebar layout** — навигация, фильтры, настройки в боковой панели; основной контент справа
- **Публичный фронтенд** — просмотр песен, сет-листов
- **Админка** (`/admin`) — редактирование песен, сет-листов, импорт. Защита: пароль (env `ADMIN_PASSWORD`, заголовок `X-Admin-Password`)
- **Персональные настройки** — в localStorage (транспонирование, шрифт, цвета, тема, customThemes)
- **Данные песен** — в PostgreSQL (title, artist, key, chordpro, tags, status)
- **Формат песен** — ChordPro (аккорды в [квадратных скобках])

## Структура проекта

```
client/                  # React + Vite
  src/
    api/                 # fetch-обёртки для API
    utils/               # ChordPro парсер, транспонирование
    hooks/               # useLocalSettings, useAutoScroll
    context/             # SettingsContext, AdminContext, SongsContext, SidebarContext, SongControlsContext
    components/          # AppLayout, Sidebar, SongContent, SongLine
    pages/               # SongList, SongView, SetlistView, SongEditor, SetlistEditor, Import, Admin

server/                  # Node.js + Express
  src/
    routes/              # API endpoints (songs, setlists, import, export, admin)
    db/
      pool.js            # pg Pool + auto-migrations
      migrations/        # SQL файлы (001-init, 002-song-status)
```

## Контексты (React)

| Контекст | Назначение |
|----------|-----------|
| SettingsContext | Тема, цвета, шрифт, per-song настройки (localStorage) |
| AdminContext | Авторизация admin (пароль в localStorage) |
| SongsContext | Загрузка песен/сет-листов один раз, раздаёт sidebar и страницам |
| SidebarContext | Состояние sidebar (open/close, mobile detection, persist) |
| SongControlsContext | Мост SongView ↔ Sidebar для per-song controls |

## API

```
GET    /api/songs                  # Все песни (id, title, artist, key, tags, status, sort_order, created_at)
GET    /api/songs/:id              # Одна песня (все поля включая chordpro)
POST   /api/songs          [admin] # Создать
PUT    /api/songs/:id       [admin] # Обновить (включая status)
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
songs    (id, title, artist, key, chordpro, tags[], status, sort_order, created_at, updated_at)
setlists (id, name, song_ids[], created_at, updated_at)
```

Статусы песен: `new` (по умолчанию), `learning`, `known`

## Роутинг (URL)

```
/                    → Таблица песен (sidebar: поиск, фильтры, исполнители, сет-листы, настройки)
/song/:id            → Просмотр песни (per-song controls в sidebar)
/setlist/:id         → Сет-лист с навигацией prev/next
/admin               → Вход по паролю
/admin/songs/new     → Новая песня
/admin/songs/:id     → Редактирование песни
/admin/setlists/new  → Новый сет-лист
/admin/setlists/:id  → Редактирование сет-листа
/admin/import        → Импорт ChordPro
```

## Sidebar

Раскрытый (260px): лого, поиск, все песни, фильтр по статусу, исполнители, сет-листы, admin actions, настройки (темы, 8 цветов с hex, просмотр), per-song controls.

Свёрнутый (48px): иконки — меню, песни, исполнители, сет-листы, настройки.

Mobile (<768px): drawer overlay.

## Темы

4 пресета (dark, light, contrast, warm) + пользовательские модификации (`customThemes` в localStorage).
8 настраиваемых цветов: text, textMuted, chords, bg, surface, border, chorusBg, bridgeBg.
Hex-ввод + color picker. Кнопка "Сбросить цвета темы".

## Конвенции

- Миграции: `server/src/db/migrations/NNN-description.sql` (автоприменение при старте)
- Язык интерфейса: русский
- ID: текстовые (timestamp + random)
- Формат данных: ChordPro. Секции: `{sov}/{eov}`, `{soc}/{eoc}`, `{sob}/{eob}`
- Git: main (стабильная)
- Принцип UI: никаких элементов управления в правом верхнем углу, кнопки рядом с контентом

## Статус реализации

| Функция | Статус |
|---------|--------|
| Sidebar layout (навигация, фильтры, настройки) | Готово |
| Таблица песен с сортировкой (5 столбцов) | Готово |
| Фильтр по статусу (Новые/Учу/Знаю) | Готово |
| Фильтр по исполнителям | Готово |
| Быстрое переключение статуса в таблице | Готово |
| Меню действий (три точки) в таблице | Готово |
| Просмотр песни с аккордами | Готово |
| Транспонирование (per-song, в sidebar) | Готово |
| Автопрокрутка | Готово |
| Fit-to-screen | Готово |
| Скрытие/показ аккордов | Готово |
| Сет-листы с навигацией | Готово |
| 4 темы + полный редактор цветов (8 цветов, hex) | Готово |
| Размер шрифта, интервал, моно | Готово |
| Админка (пароль) | Готово |
| Редактор песни (ChordPro + превью) | Готово |
| Редактор сет-листа (таблица с чекбоксами) | Готово |
| Импорт ChordPro (файл/текст) | Готово |
| Экспорт коллекции | Готово |
| Backend API (CRUD + status) | Готово |
| Docker (3 контейнера) | Готово |
| Деплой на сервер | Готово |
| nginx + certbot SSL | Готово |
| Mobile responsive | В процессе |
| Многоколоночный текст песни | Планируется |
| Фон/рамка аккордов | Планируется |
| Аппликатуры аккордов | Планируется |
| Мини-плеер YouTube | Планируется |
| Версии сложности аккордов | Планируется |
