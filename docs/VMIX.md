# vMix

## Запуск

```powershell
node server.mjs
```

## Добавление оверлея

1. Add Input.
2. Выберите `Web Browser`.
3. Вставьте URL:

```text
http://127.0.0.1:5173/overlay.html?source=%2Fapi%2Fmatch%2Fflashscore%3Fid%3DSril3X2m&news=/data/news-demo.json&panel=stats&poll=3000
```

4. Размер: `1920 x 1080`.
5. Если нужна проверка зон, временно добавьте `&guides=1`.
6. Для обновления перед эфиром перезагрузите Web Browser input.

## Режимы

- Статистика: `panel=stats`
- Чат: `panel=chat`

## Диагностика

- Если счёт не меняется, проверьте endpoint adapter-а в браузере.
- Если страница белая или чёрная, проверьте размер input и включите прозрачный фон.
- Если vMix кеширует страницу, удалите input и добавьте заново.
