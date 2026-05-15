# TENNIS Listen Bolshe Overlay

Cloudflare Worker для live-теннисного оверлея и отдельного Telegram-бота `@listen_bolshe_bot`.

## Production

- Overlay: `https://tennis-listen-bolshe-overlay.znamteam-903.workers.dev/overlay.html`
- Health: `https://tennis-listen-bolshe-overlay.znamteam-903.workers.dev/api/health`
- Live matches API: `https://tennis-listen-bolshe-overlay.znamteam-903.workers.dev/api/live-matches`
- Live tennis news API: `https://tennis-listen-bolshe-overlay.znamteam-903.workers.dev/api/news/tennis`
- Telegram webhook: `https://tennis-listen-bolshe-overlay.znamteam-903.workers.dev/telegram/webhook`

## Telegram bot

`/start` and `/overlay` open the live production menu:

1. choose a live Flashscore tennis match;
2. choose OBS, Streamlabs, or vMix;
3. choose `stats` or `chat` overlay mode;
4. receive a ready Browser Source/Web Browser URL with setup steps.

Required GitHub repository secrets in `TENNIS-Listen-Bolshe`:

- `TELEGRAM_BOT_TOKEN` - token from BotFather for `@listen_bolshe_bot`;
- `TELEGRAM_WEBHOOK_SECRET` - optional long random string for Telegram webhook validation.

The deploy workflow syncs these into Cloudflare Worker secrets and calls Telegram `setWebhook`.

## Live News

`/api/news/tennis` pulls the latest 15 tennis headlines from:

```text
https://www.sports.ru/tennis/news/top/
```

The overlay ticker refreshes this feed every minute. If Sports.ru is temporarily unavailable, the endpoint returns a small fallback ticker instead of breaking the overlay.

## Local Preview

```bash
node server.mjs
```

After launch:

- selector: `http://127.0.0.1:5173/`
- overlay: `http://127.0.0.1:5173/overlay.html`

## Flashscore Adapter

```text
/api/match/flashscore?id=Sril3X2m
```

or:

```text
/api/match/flashscore?url=https%3A%2F%2Fwww.flashscore.com%2Fmatch%2Ftennis%2Fjasika-omar-lOWZLw6o%2Fstewart-hamish-0j2A0w2n%2F%3Fmid%3DSril3X2m
```

OBS, Streamlabs, and vMix setup notes live in `docs/OBS.md`, `docs/STREAMLABS.md`, and `docs/VMIX.md`.
