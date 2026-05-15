# TENNIS Listen Bolshe Overlay

Практичный MVP оверлея для теннисных трансляций в OBS, Streamlabs и vMix.

## Быстрый запуск

```powershell
node server.mjs
```

После запуска:

- панель выбора: `http://127.0.0.1:5173/`
- оверлей: `http://127.0.0.1:5173/overlay.html`
- демо: `http://127.0.0.1:5173/overlay.html?source=/data/live-match-demo.json&news=/data/news-demo.json&panel=stats&poll=3000`
- Flashscore-матч Jasika - Stewart: `http://127.0.0.1:5173/overlay.html?source=%2Fapi%2Fmatch%2Fflashscore%3Fid%3DSril3X2m&news=/data/news-demo.json&panel=stats&poll=3000`

## Flashscore adapter

Endpoint:

```text
/api/match/flashscore?id=Sril3X2m
```

или:

```text
/api/match/flashscore?url=https%3A%2F%2Fwww.flashscore.com%2Fmatch%2Ftennis%2Fjasika-omar-lOWZLw6o%2Fstewart-hamish-0j2A0w2n%2F%3Fmid%3DSril3X2m
```

Adapter получает публично загружаемые feed-данные Flashscore и приводит их к формату из [docs/DATA_FORMAT.md](docs/DATA_FORMAT.md). Он сделан заменяемым: при смене источника данных оверлей и OBS/vMix URL не должны переписываться.

## OBS / Streamlabs / vMix

Инструкции лежат в `docs/OBS.md`, `docs/STREAMLABS.md`, `docs/VMIX.md`.
