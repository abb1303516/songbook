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
- **Единый SongView** — просмотр песни из любого контекста (список, сет-лист); галерейная навигация prev/next
- **Публичный фронтенд** — просмотр песен, сет-листов
- **Админка** (`/admin`) — редактирование песен, сет-листов, импорт. Защита: пароль (env `ADMIN_PASSWORD`, заголовок `X-Admin-Password`)
- **Настройки** — глобальные в PostgreSQL (темы, шрифт, интервал), per-device в localStorage (fitScale, sidebar state)
- **Данные песен** — в PostgreSQL (title, artist, key, chordpro, tags, status, transpose)
- **Формат песен** — ChordPro (аккорды в [квадратных скобках])
- **Шрифт** — только моноширинный (Source Code Pro), без выбора

## Структура проекта

```
client/                  # React + Vite
  src/
    api/                 # fetch-обёртки для API
    utils/               # ChordPro парсер, транспонирование
    hooks/               # useLocalSettings, useAutoScroll
    context/             # SettingsContext, AdminContext, SongsContext, SidebarContext, SongControlsContext
    components/          # AppLayout, Sidebar, SongContent, SongLine, SongMenu
    pages/               # SongList, SongView, SetlistRedirect, SongEditor, SetlistEditor, Import, Admin

server/                  # Node.js + Express
  src/
    routes/              # API endpoints (songs, setlists, settings, import, export, admin)
    db/
      pool.js            # pg Pool + auto-migrations
      migrations/        # SQL файлы (001-init, 002-song-status, ...)
```

## Контексты (React)

| Контекст | Назначение |
|----------|-----------|
| SettingsContext | Тема, цвета, шрифт (серверные + localStorage) |
| AdminContext | Авторизация admin (пароль в localStorage) |
| SongsContext | Песни, сет-листы, navList для галерейной навигации |
| SidebarContext | Левая панель: open/close, mobile, ширина (resize) |
| RightSidebarContext | Правая панель: open/close, mobile, ширина, chordSize |
| SongControlsContext | Мост SongView ↔ Sidebar для per-song controls |

## API

```
GET    /api/songs                  # Все песни (включая transpose, youtube_urls, youtube_labels)
GET    /api/songs/:id              # Одна песня (все поля включая chordpro)
POST   /api/songs          [admin] # Создать
PUT    /api/songs/:id       [admin] # Обновить
PUT    /api/songs/:id/status       # Обновить статус (публичный)
PUT    /api/songs/:id/transpose    # Обновить транспонирование (публичный)
DELETE /api/songs/:id       [admin] # Удалить

GET    /api/setlists               # Все сет-листы
GET    /api/setlists/:id           # Один сет-лист с песнями
POST   /api/setlists       [admin] # Создать
PUT    /api/setlists/:id    [admin] # Обновить
DELETE /api/setlists/:id    [admin] # Удалить

GET    /api/settings               # Глобальные настройки (темы, шрифт, интервал)
PUT    /api/settings               # Сохранить настройки (публичный)

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
songs    (id, title, artist, key, chordpro, tags[], status, transpose, youtube_urls[], youtube_labels[], sort_order, created_at, updated_at)
setlists (id, name, song_ids[], created_at, updated_at)
settings (key TEXT PRIMARY KEY, value JSONB)  -- одна строка 'global'
```

Статусы песен: `new` (по умолчанию), `learning`, `known`

Миграции:
- `001-init.sql` — базовые таблицы
- `002-song-status.sql` — поле `status`
- `003-transpose-and-settings.sql` — `transpose` + таблица `settings`
- `004-youtube-urls.sql` — `youtube_urls TEXT[]`
- `005-youtube-labels.sql` — `youtube_labels TEXT[]` параллельно с urls

## Хранение настроек

| Настройка | Где хранится | Почему |
|-----------|-------------|--------|
| Транспонирование | БД, per-song (songs.transpose) | Глобальный атрибут песни, одинаков на всех устройствах |
| Темы (4 пресета + customThemes) | БД (settings) | Синхронизация между устройствами |
| Текущая тема | localStorage | Каждое устройство выбирает свою тему |
| Размер шрифта | БД (settings) | Глобальная настройка |
| Интервал (lineHeight) | localStorage, per-song | Зависит от размера экрана устройства |
| showChords, useH, chordStyle | БД (settings) | Глобальная настройка |
| fitScale, columns | localStorage, per-song | Зависит от размера экрана устройства |
| navList | sessionStorage | Сохраняется при F5, очищается при закрытии вкладки |
| Состояние + ширина левого sidebar | localStorage | Per-device, ресайз мышкой (200-400px) |
| Состояние + ширина правой панели | localStorage | Per-device, ресайз мышкой (200-500px) |
| Размер аппликатур (chordSize) | localStorage | Per-device (70-250px, шаг 20px) |

## Роутинг (URL)

```
/                    → Таблица песен (sidebar: поиск, фильтры, исполнители, сет-листы, настройки)
/song/:id            → Единый просмотр песни (галерейная навигация, three-dot menu, per-song controls)
/song/:id?setlist=X  → Просмотр песни в контексте сет-листа
/setlist/:id         → Redirect → /song/{первая песня}?setlist={id}
/admin               → Вход по паролю
/admin/songs/new     → Новая песня
/admin/songs/:id     → Редактирование песни
/admin/setlists/new  → Новый сет-лист
/admin/setlists/:id  → Редактирование сет-листа
/admin/import        → Импорт ChordPro
```

## Просмотр песни (SongView)

- Заголовок в одну строку: `Исполнитель — Название [⋮]`
- Кликабельный исполнитель → фильтр по исполнителю
- Три точки [⋮]: редактировать, статус (галочки), сет-листы (toggle), удалить
- Галерейные стрелки: hover по левому/правому краю текста → полупрозрачные стрелки
- Навигация prev/next через navList (текущий фильтр или сет-лист)
- Per-song controls в sidebar: транспонирование, масштаб, колонки, автопрокрутка
- Быстрые controls на свёрнутом sidebar: транспонирование ↑↓, масштаб +/−, колонки

## Sidebar (левая панель)

Раскрытый (260px по умолчанию, настраивается): лого, поиск, все песни, фильтр по статусу, исполнители, сет-листы (активный выделен), admin actions, настройки (темы, 12 цветов с hex, просмотр, стиль аккордов), per-song controls.

Свёрнутый (48px): иконки — меню, песни, исполнители, сет-листы, настройки + quick controls при просмотре песни (тон ↑↓, масштаб +/−, колонки).

Ширина настраивается перетаскиванием правого края (200-400px).

Mobile (<768px): drawer overlay, плавающий hamburger.

## Правая панель (RightSidebar)

Открывается кнопкой-grid в заголовке SongView. Содержит:
- **Аккорды** — аппликатуры из текущей песни, через `@tombatossals/react-chords` + `chords-db`
  - Grid с auto-fit по размеру диаграмм
  - Кнопки +/- для размера (70-250px)
  - Клик по диаграмме — цикл по вариантам позиций (X/N)
  - Номер лада слева от диаграммы на уровне barre (top: 27.86% = (13+6.5)/70, учитывая translate(13,13) в SVG)
- **YouTube** — до 3 ссылок с кастомными лейблами
  - Табы с названиями из `youtube_labels[]`
  - iframe 16:9

Ширина настраивается перетаскиванием левого края (200-500px), per-device.
Mobile: drawer справа с backdrop.

## Темы и цвета

4 пресета (dark, light, contrast, warm) + пользовательские модификации (`customThemes`).
Цвета тем хранятся в БД (settings), выбор темы — в localStorage (per-device).
12 настраиваемых цветов: text, textMuted, accent, chords, chordBg, bg, surface, border, chorusBg, chorusBorder, bridgeBg, bridgeBorder.
- `accent` — UI акценты (sidebar ссылки, фильтры, кнопки), отделён от `chords`
- `chords` — цвет текста аккордов в песне
- `chordBg` — фон аккордов (для стиля "Фон" / "Фон+Рамка")
Hex-ввод + color picker. Кнопка "Сбросить цвета темы".

## Отображение текста

- Шрифт: только моноширинный (Source Code Pro)
- Размер аккордов: такой же как текст (не настраивается отдельно)
- Стиль аккордов: нет / фон / рамка / фон+рамка (цикл, per-theme в customThemes)
- Многоколоночный текст: 1-2-3 колонки (per-device, localStorage)
- Интервал (lineHeight): per-song per-device, диапазон 0.7–2.5
- Масштаб (fitScale): per-device, зависит от экрана
- Word-wrap: каждое слово — inline-block с аккордом над первым словом. При переносе текста по ширине аккорды остаются с парой.

## Mobile / touch-устройства

- Sidebar полностью скрывается, плавающая кнопка-hamburger top-left
- Swipe left/right по тексту песни — переход к prev/next
- Gallery-arrows скрыты на touch-устройствах (определяется через navigator.maxTouchPoints)
- Горизонтальный overflow отключён
- При вводе в поиск sidebar не закрывается (удобство ввода)

## Конвенции

- Миграции: `server/src/db/migrations/NNN-description.sql` (автоприменение при старте)
- Язык интерфейса: русский
- ID: текстовые (timestamp + random)
- Формат данных: ChordPro. Секции: `{sov}/{eov}`, `{soc}/{eoc}`, `{sob}/{eob}`
- Git: main (стабильная)
- Принцип UI: никаких элементов управления в правом верхнем углу, кнопки рядом с контентом
- Все интерактивные элементы: cursor-pointer + hover эффект
- Dropdown меню: непрозрачный фон + тень

## Статус реализации

| Функция | Статус |
|---------|--------|
| Sidebar layout (навигация, фильтры, настройки) | Готово |
| Таблица песен с сортировкой (5 столбцов) | Готово |
| Фильтр по статусу (Новые/Учу/Знаю) | Готово |
| Фильтр по исполнителям | Готово |
| Быстрое переключение статуса (публичный API) | Готово |
| Единое меню действий (SongMenu) в таблице и просмотре | Готово |
| Единый просмотр песни (SongView) с галерейной навигацией | Готово |
| Транспонирование (per-song, в sidebar) | Готово |
| Автопрокрутка | Готово |
| Fit-to-screen | Готово |
| Скрытие/показ аккордов | Готово |
| Навигация по сет-листу через SongView | Готово |
| Активный сет-лист выделен в sidebar | Готово |
| 4 темы + 12 цветов (accent отделён от chords) | Готово |
| Серверные настройки (sync между устройствами) | Готово |
| Транспонирование в БД (per-song) | Готово |
| Стиль аккордов (фон/рамка/оба) + chordBg | Готово |
| Многоколоночный текст (1-2-3) | Готово |
| Quick controls на свёрнутом sidebar | Готово |
| Редактор сет-листа (↑↓, фильтр, три точки) | Готово |
| Админка (пароль) | Готово |
| Редактор песни (ChordPro + превью) | Готово |
| Импорт ChordPro (файл/текст) | Готово |
| Экспорт коллекции | Готово |
| Backend API (CRUD + status + transpose + settings) | Готово |
| Docker (3 контейнера) | Готово |
| Деплой на сервер | Готово |
| nginx + certbot SSL | Готово |
| Mobile responsive (drawer, swipe, word-wrap) | Готово |
| Справка по ChordPro в редакторе | Готово |
| Стилизация скроллбара (глобально) | Готово |
| Аппликатуры аккордов (правая панель) | Готово |
| Мини-плеер YouTube (до 3 ссылок с лейблами) | Готово |
| Ресайз ширины sidebar мышкой (оба) | Готово |
| Настройка размера аппликатур (+/−) | Готово |
| Версии сложности аккордов | Планируется |
| Автоподбор тональности | Планируется |
| PWA / офлайн | Планируется |
| Экспорт в PDF | Планируется |

## Аппликатуры аккордов

Используется `@tombatossals/react-chords@0.2.10` + `@tombatossals/chords-db@0.5.1` (~500 аккордов).

**Парсинг уникальных аккордов** из ChordPro текста (с учётом transpose + useH).

**Ключевые фиксы под тёмные темы:**
- CSS переопределяет `[fill="#444"]` → `colors.text`
- Номера пальцев (`text[fill="white"]`) — получают `colors.bg` для контраста
- Открытые струны (`circle[fill="white"]`) — outline вместо fill
- Шрифт tuning-нот 5px bold
- `display:none` на built-in SVG fret label (конфликтовал с React)

**Номер лада** — рендерится как отдельный HTML-div слева от диаграммы:
- SVG viewBox `80×70`, но внутри `<g transform="translate(13, 13)">`
- Barre на SVG y = 13 + 6.5 = 19.5 → top 27.86% с translateY(-50%)
- Обёртка имеет `aspect-ratio: 80/70` для стабильной пропорции

**Нормализация позиций** (`normalizePosition`):
- Когда baseFret=1 и все frets ≥ 2 без открытых струн — сдвигаем, чтобы baseFret отражал реальный лад
- Открытые струны (fret=0) сохраняются — диаграмма остаётся с nut линией

## YouTube плеер

- До 3 ссылок: `songs.youtube_urls TEXT[]` + `songs.youtube_labels TEXT[]`
- Парсинг video ID из URL: `utils/youtube.js`
- Табы переключения с кастомными названиями (label или "Вариант N")
- iframe 16:9 с preserved-aspect-ratio
