# PDRForge REST API

Базовый адрес локально: `http://localhost:4000/api/v1`.

Авторизация: `Authorization: Bearer <accessToken>`. Токен выдаёт `POST /auth/demo`. Срок — 30 дней. Куки не используются, поэтому тот же контракт подойдёт клиенту Expo.

Деньги — целые рубли. Даты — ISO 8601.

Ошибки: JSON `{ "statusCode", "message", "error" }`. `message` может быть строкой или массивом строк валидации.

## Публичные

| Метод | Путь | Ответ |
| --- | --- | --- |
| GET | `/health` | `{ ok: true, service: "pdrforge-api" }` |
| POST | `/auth/demo` | `{ accessToken, user, workshop }`. Если мастерских нет, сначала создаётся демо «Северный Контур». |

## Сессия

| Метод | Путь | Описание |
| --- | --- | --- |
| GET | `/auth/me` | Текущий сотрудник и мастерская. Роль читается из базы, не из заявки в токене. |

## Мастерская и каталог

| Метод | Путь | Описание |
| --- | --- | --- |
| GET | `/workshop` | Профиль, реквизиты, направления |
| PATCH | `/workshop` | Название, реквизиты, НДС, банк, текст печати |
| PUT | `/workshop/directions` | `{ items: [{ code, name, enabled, isCustom }] }`. Пустой `code` станет `custom-…` |
| POST | `/workshop/logo` | multipart `file`, PNG или JPEG |
| GET | `/catalog/services?direction=` | Услуги и комплексы |
| POST | `/catalog/services` | `{ directionCode, name, price, isComplex, minutes }` |
| PATCH | `/catalog/services/:id` | То же тело |
| DELETE | `/catalog/services/:id` | |

## Клиенты и гараж

| Метод | Путь | Описание |
| --- | --- | --- |
| GET | `/clients?q&take&skip` | `{ total, items }` |
| POST | `/clients` | `{ kind: person\|company, name, phone, email, inn, notes }` |
| GET | `/clients/:id` | Карточка и автомобили |
| PATCH | `/clients/:id` | Те же поля |
| DELETE | `/clients/:id` | Нельзя, если есть заявки |
| GET | `/clients/:id/history` | Заявки клиента |
| POST | `/clients/:id/vehicles` | `{ make, model, year, plate, vin, mileage, carClass, color, bodyType }` |
| GET | `/vehicles/:id` | |
| PATCH | `/vehicles/:id` | Те же поля автомобиля |
| DELETE | `/vehicles/:id` | Нельзя, если есть заявки |
| GET | `/vehicles/:id/history` | |

`carClass`: `a`, `b`, `c`, `d`, `e`, `suv`, `premium`.

## Заявки

Статусы: `draft`, `planned`, `in_progress`, `done`.

| Метод | Путь | Описание |
| --- | --- | --- |
| GET | `/orders?status&q&from&to&take&skip` | `{ total, items }` с итогами |
| POST | `/orders` | `{ clientId, vehicleId, status? }` |
| GET | `/orders/:id` | Состав, фото, оплаты, итоги |
| PATCH | `/orders/:id` | Статус, `scheduledAt`, `durationMin`, `assigneeId`, заметки, выезд, пробег |
| DELETE | `/orders/:id` | |
| POST | `/orders/:id/lines` | Каталог, комплекс или своя услуга |
| PATCH | `/orders/:id/lines/:lineId` | Для `kind: pdr` цену с клиента не принять |
| DELETE | `/orders/:id/lines/:lineId` | |
| POST | `/orders/:id/constructor` | Атомарно: PDR + арматура + выезд |
| POST | `/orders/:id/payments` | `{ amount, method: cash\|card\|transfer, note, paidAt }` |
| DELETE | `/orders/:id/payments/:paymentId` | |
| POST | `/orders/:id/lines/:lineId/photos?phase=before\|after` | multipart `file` |
| DELETE | `/photos/:id` | |

Итоги заявки считает сервер:

- `laborTotal` — сумма строк
- `minLift` — доплата до минимального заказа, только на работы
- `travelFee` — `travelBaseFee + travelKm * travelPerKm`, если выезд включён
- `grandTotal`, `paid`, `debt = max(0, grandTotal - paid)`

Строка каталога: `{ directionCode, kind: service|complex|custom, title, unitPrice, qty, minutes, panelCode, panelName, serviceId }`.

## Конструктор PDR

`POST /constructor/calculate` и `POST /orders/:id/constructor` принимают:

```json
{
  "panelCode": "hood",
  "panelName": "Капот",
  "armatureIds": [],
  "travelEnabled": false,
  "travelKm": 0,
  "pdr": {
    "shape": "circle",
    "diameterMm": 20,
    "widthMm": 40,
    "heightMm": 10,
    "lengthMm": 160,
    "count": 1,
    "hailKey": "none",
    "complexityKey": "standard",
    "materialKey": "steel",
    "carClassKey": "b",
    "coatingKey": "factory",
    "adjustPercent": 0
  }
}
```

Формы:

- `circle` — диаметр, цена по контрольным точкам, между точками smoothstep
- `oval` — эквивалентный диаметр `√(width × height)`, дальше как круг
- `stripe` — билинейная матрица ширина × длина

Дальше: коэффициенты града, сложности, материала, класса и покрытия, ползунок в пределах политики, округление, умножение на количество.

| Метод | Путь | Кто меняет |
| --- | --- | --- |
| GET | `/constructor/settings` | Все сотрудники |
| POST | `/constructor/calculate` | Все |
| PUT | `/constructor/control-points` | `{ points: [{ diameterMm, price }] }` |
| PUT | `/constructor/coefficients` | `{ items: [{ group, key, label, multiplier, sort }] }` |
| PUT | `/constructor/matrix` | `{ widths, lengths, prices }` |
| PATCH | `/constructor/policy` | Выезд, минимум, округление, мин/макс/шаг ползунка, `staffCanAdjust` |
| POST | `/constructor/armature` | `{ name, price, minutes, panelCode, active }` |
| PATCH | `/constructor/armature/:id` | |
| DELETE | `/constructor/armature/:id` | |

Если `staffCanAdjust` выключен, мастер не может сохранить ненулевую корректировку. Владелец и администратор могут.

## Команда, аналитика, уведомления, файлы

| Метод | Путь | Описание |
| --- | --- | --- |
| GET | `/team` | Сотрудники |
| POST | `/team` | `{ name, phone, role, title, email, color }` |
| PATCH | `/team/:id` | Нельзя убрать последнего владельца |
| GET | `/analytics?from&to` | Начислено, собрано, средний чек, направления, загрузка, расходы, открытый долг |
| GET | `/expenses` | |
| POST | `/expenses` | `{ category, amount, note, spentAt }` |
| DELETE | `/expenses/:id` | |
| GET | `/notifications` | |
| POST | `/notifications/read-all` | |
| POST | `/notifications/:id/read` | |
| GET | `/documents/orders/:id/work-order.pdf` | PDF заказ-наряда |
| GET | `/documents/orders/:id/act.pdf` | PDF акта |
| GET | `/export/clients.xlsx` | Excel |
| GET | `/export/orders.xlsx` | Excel |

Файлы фото и логотипа отдаются с `/uploads/...` без префикса `/api/v1`.

Роли: `owner`, `admin`, `master`.
