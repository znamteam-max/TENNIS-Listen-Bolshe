# Streamlabs

## Запуск

```powershell
node server.mjs
```

## Browser Source

1. Добавьте `Browser Source`.
2. Вставьте URL:

```text
http://127.0.0.1:5173/overlay.html?source=%2Fapi%2Fmatch%2Fflashscore%3Fid%3DSril3X2m&news=/data/news-demo.json&panel=stats&poll=3000
```

3. Width: `1920`.
4. Height: `1080`.
5. Включите прозрачность, если Streamlabs показывает настройку background/transparent.
6. Перед эфиром нажмите refresh у Browser Source.

## Режимы

- `panel=stats` - левая панель со статистикой.
- `panel=chat` - левая панель под чат.

## Если данные не обновляются

- Проверьте, что сервер запущен.
- Откройте `http://127.0.0.1:5173/api/health`.
- Откройте `http://127.0.0.1:5173/api/match/flashscore?id=Sril3X2m`.
- Увеличьте `poll`, например до `5000`.
