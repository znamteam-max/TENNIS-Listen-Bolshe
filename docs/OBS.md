# OBS

## Запуск

```powershell
node server.mjs
```

Панель откроется по адресу:

```text
http://127.0.0.1:5173/
```

## Browser Source

1. Добавьте `Browser` source.
2. Вставьте URL из панели или используйте готовый:

```text
http://127.0.0.1:5173/overlay.html?source=%2Fapi%2Fmatch%2Fflashscore%3Fid%3DSril3X2m&news=/data/news-demo.json&panel=stats&poll=3000
```

3. Width: `1920`.
4. Height: `1080`.
5. CSS оставьте пустым.
6. Фон оверлея уже прозрачный.

## Переключение статистики и чата

- Статистика: `panel=stats`
- Чат: `panel=chat`

## Проверка перед эфиром

- Откройте URL в обычном браузере.
- Добавьте `guides=1`, если нужно увидеть зоны.
- Нажмите Refresh cache/current page в свойствах Browser Source, если данные зависли.
- Проверьте, что endpoint `/api/match/flashscore?id=Sril3X2m` отдаёт JSON.
