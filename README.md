# frinustore-backend

Бот-менеджер маркета плагинов Inugram. ТЗ: [docs/BOT_SPEC.md](docs/BOT_SPEC.md), архитектура клиента: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Bun + grammY + Neon Postgres, деплой на Vercel (webhook, cron).

## Запуск

```sh
bun install
cp .env.example .env      # заполнить
bun run migrate           # миграции из migrations/
bun run dev               # локально, long polling (снимает webhook)
bun test                  # юнит-тесты + сценарии на PGlite (Postgres в процессе)
bun run typecheck
```

## Деплой (Vercel)

1. Env (Production и отдельные тестовые для Preview): `BOT_TOKEN`, `WEBHOOK_SECRET`, `CRON_SECRET`, `DATABASE_URL` (pooled Neon),
   `CHANNEL_ID` (`-100…`), `CHANNEL_USERNAME`, `ADMIN_IDS`, `MODERATION`, `DAILY_LIMIT`, опционально `MOD_CHAT_ID`.
2. Бот — администратор канала (публикация, редактирование, закрепление); в BotFather включить inline mode (`/setinline`).
3. `bun run migrate` выполняется как `buildCommand`.
4. После деплоя: `WEBHOOK_URL=https://<project>.vercel.app/api/webhook bun run set-webhook`.
5. Проверка: `getWebhookInfo` без `last_error_message`; запрос без заголовка секрета → 401.

Cron (`/api/cron/flush`, раз в сутки — лимит Hobby) выносит счётчик установок в `catalog.json`, разбирает очередь `jobs` и
возвращает в очередь зависшие публикации. Для «раз в 10 минут» нужен Pro: поменять `schedule` в `vercel.json`.

## Устройство

| Файл | Что делает |
| --- | --- |
| `api/webhook.ts`, `api/cron/flush.ts` | входные точки |
| `src/bot.ts` | grammY: дедупликация апдейтов, баны, команды, inline-счётчик установок |
| `src/menu.ts`, `src/admin.ts`, `src/ui.ts` | меню на inline-кнопках, модерация |
| `src/wizard.ts` | мастер публикации (состояние в таблице `sessions`) |
| `src/submit.ts` | проверки, решение о модерации, карточки модераторам |
| `src/publish.ts` | публикация/откат, пересборка и закреп `catalog.json` под lease-локом |
| `src/catalog.ts`, `src/plugin-header.ts`, `src/semver.ts`, `src/validate.ts` | чистая логика (покрыта тестами) |
| `src/store.ts`, `src/db.ts`, `migrations/` | Postgres |

Пересборка каталога сериализуется lease-локом в `meta` (advisory-локи не работают поверх HTTP-драйвера Neon).
Если лок занят дольше ожидания, ставится `jobs(type='rebuild')` — задания коалесцируются. Каталог пишется раньше, чем
удаляется файл версии, поэтому в нём не бывает версии без файла.
