# Data Format

Оверлей читает JSON из параметра `source`. Источник может быть локальным файлом, proxy URL или endpoint adapter-а.

Минимальная структура:

```json
{
  "schemaVersion": "1.0",
  "provider": "flashscore",
  "generatedAt": "2026-05-12T06:00:00.000Z",
  "match": {
    "id": "Sril3X2m",
    "title": "Omar Jasika - Hamish Stewart",
    "tournament": "CHALLENGER MEN - SINGLES: Bengaluru 2",
    "status": "live",
    "stage": "Set 1",
    "duration": "0:29"
  },
  "players": [
    {
      "side": "home",
      "name": "Omar Jasika",
      "shortName": "Jasika O.",
      "country": "Australia",
      "rank": "518",
      "isServing": true
    },
    {
      "side": "away",
      "name": "Hamish Stewart",
      "shortName": "Stewart H.",
      "country": "United Kingdom",
      "rank": "328",
      "isServing": false
    }
  ],
  "score": {
    "current": {
      "home": "40",
      "away": "30"
    },
    "games": {
      "home": "3",
      "away": "4"
    },
    "sets": [
      {
        "label": "Set 1",
        "homeGames": "3",
        "awayGames": "4",
        "winner": ""
      }
    ]
  },
  "statistics": [
    {
      "section": "Service",
      "rows": [
        {
          "label": "Aces",
          "home": "1",
          "away": "3"
        }
      ]
    }
  ]
}
```

## Notes

- `players[].side`: `home` или `away`.
- `players[].isServing`: включает индикатор подачи в scorebug.
- `score.current`: текущие очки в гейме.
- `score.games`: счёт по геймам в текущем сете.
- `statistics[].rows`: выводятся в левой панели в режиме `panel=stats`.
- `generatedAt`: используется только для подписи времени обновления.
