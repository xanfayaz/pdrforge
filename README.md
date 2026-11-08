# PDRForge

Open-source CRM for paintless dent repair and body shops. Local-first on macOS, one REST API for a future Expo app.

PDRForge — CRM для PDR и кузовных мастерских. Кабинет на русском: клиенты и гараж, заявки, конструктор повреждений, календарь, оплаты, PDF и Excel. Реальных платежей нет. Тарифы на лендинге — заглушки.

Демо-вход без регистрации. При первом запуске API создаёт мастерскую «Северный Контур» с тестовыми заявками. Это локальный режим: токен демо-владельца не подходит для публичного сервера без отдельной аутентификации.

## Стек

- `apps/web` — Next.js (App Router), TypeScript, Tailwind CSS
- `apps/api` — NestJS, Prisma, PostgreSQL
- `packages/shared` — общий расчёт PDR, справочники элементов и статусов

Мобильное приложение позже может ходить в тот же API. Контракт описан в [docs/API.md](docs/API.md).

## Что нужно

- macOS, Node.js 20 или новее
- Docker Desktop **или** PostgreSQL 16 (Homebrew либо Postgres.app)

Проверено на Node.js 22.

## Вариант 1. Docker Compose

Если на Mac уже крутится PostgreSQL на порту 5432, остановите его или задайте другой порт:

```bash
brew services stop postgresql@16
# или
POSTGRES_PORT=5433 docker compose up --build
```

Запуск:

```bash
docker compose up --build
```

- Кабинет: http://localhost:3000
- API: http://localhost:4000/api/v1/health

Первый старт применяет миграции и создаёт демо-данные. Остановка: `Ctrl+C`, тома сохраняются. Полная очистка базы: `docker compose down -v`.

Если Docker не установлен, используйте вариант 2.

## Вариант 2. Node.js и PostgreSQL на Mac

### Homebrew

```bash
brew install node postgresql@16
brew services start postgresql@16
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
```

На Intel Mac путь обычно `/usr/local/opt/postgresql@16/bin`.

### Postgres.app

Установите [Postgres.app](https://postgresapp.com/), запустите сервер и добавьте его `bin` в `PATH`.

### Проект

```bash
npm run setup
npm run dev
```

`npm run setup` копирует `.env`, создаёт роль и базу `pdrforge` / `pdrforge`, ставит зависимости и применяет миграции.

Если роль создавать вручную:

```sql
CREATE ROLE pdrforge LOGIN PASSWORD 'pdrforge' SUPERUSER;
CREATE DATABASE pdrforge OWNER pdrforge;
```

Кабинет: http://localhost:3000. Нажмите «Войти как демо».

## Команды

| Команда | Зачем |
| --- | --- |
| `npm run setup` | Подготовка Mac: env, база, миграции |
| `npm run dev` | API на :4000 и веб на :3000 |
| `npm test` | Расчёт PDR |
| `npm run build` | Сборка shared, API и веба |
| `npm run db:migrate` | Применить миграции |
| `npm run db:seed` | Повторно засеять, только если мастерских ещё нет |
| `npm run smoke` | Проверка API, PDF, Excel и страниц. Серверы уже должны работать |

Файлы окружения:

- `apps/api/.env` из `apps/api/.env.example`
- `apps/web/.env.local` из `apps/web/.env.example`

`NEXT_PUBLIC_API_URL` должен быть адресом, который открывает браузер: `http://localhost:4000/api/v1`. Если сайт открыт с телефона по IP компьютера, страница сама подставляет этот IP вместо `localhost`.

## Ссылка для телефона

Кабинет и API открываются с одного адреса: страница проксирует `/api/v1` и `/uploads` на Nest. Чужому человеку не нужно ставить Node и PostgreSQL, если вы дали ему уже запущенный адрес.

Пока сервер крутится на вашем Mac, публичный адрес можно выдать туннелем:

```bash
cloudflared tunnel --url http://localhost:3000
```

В ответе будет `https://….trycloudflare.com`. Эту ссылку открывают в Safari на телефоне и при желании добавляют на экран «Домой». Пока Mac выключен или туннель остановлен, ссылка не работает. Войти можно кнопкой «Войти как демо»: у любого, у кого есть ссылка, те же права, что у демо-владельца, и он видит вымышленные данные мастерской.

Репозиторий: https://github.com/xanfayaz/pdrforge

## iPhone: ярлык на экран «Домой»

Кабинет рассчитан на узкий экран: нижнее меню, карточки заявок, календарь по дням, отступы под вырез и индикатор Home. Манифест открывает сайт как приложение (`display: standalone`).

1. Телефон и Mac в одной сети Wi-Fi. Серверы слушают все интерфейсы.
2. Узнайте IP Mac: `ipconfig getifaddr en0`.
3. В Safari на iPhone откройте `http://<этот-ip>:3000`.
4. Нажмите «Поделиться» → «На экран „Домой“».
5. Ярлык PDRForge открывается без адресной строки и ведёт в кабинет.

Если macOS спросит разрешение для входящих подключений Node, разрешите его для портов 3000 и 4000. Подсказка про ярлык показывается только в Safari на iPhone и iPad.

## Кабинет

Лендинг: оффер «10 дней бесплатно», направления, тарифы без оплаты, FAQ.

Внутри:

- направления мастерской, включая своё
- клиенты, несколько автомобилей, госномер, VIN, пробег, история
- заявки: черновик, в плане, в работе, готово
- схема кузова, каталог, комплексы, свои услуги, фото до/после
- календарь: дата, время, длительность, мастер
- оплаты и задолженность
- конструктор PDR: контрольные точки со smoothstep, круг, овал через эквивалентный диаметр, полоса по матрице, коэффициенты, ползунок, арматура, выезд
- PDF заказ-наряда и акта
- реквизиты, команда и роли, аналитика, уведомления, Excel

Цены считает только сервер. Клиент не может подставить свою цену строки PDR.

## Публикация на GitHub

Репозиторий ещё можно не коммитить, пока вы не проверите запуск.

```bash
git init
git add .
git status
git commit -m "Initial PDRForge CRM"
gh repo create pdrforge --public --source=. --remote=origin --push
```

Либо создайте пустой репозиторий на GitHub и выполните:

```bash
git remote add origin git@github.com:<ваш-аккаунт>/pdrforge.git
git branch -M main
git push -u origin main
```

Не коммитьте `apps/api/.env`, `apps/web/.env.local`, `node_modules` и `apps/api/uploads`. Они уже в `.gitignore`.

Перед любым публичным адресом смените `JWT_SECRET`. Демо-вход без пароля оставьте только для локальной разработки.

CI в `.github/workflows/ci.yml` гоняет тесты расчёта, миграции и сборку на PostgreSQL 16.

## Мобильное приложение

Новый клиент на Expo живёт отдельно и вызывает этот API. Общие типы и формулу можно брать из `packages/shared`. Токен хранится у клиента и передаётся заголовком `Authorization`.

## Ограничения

- Нет регистрации, паролей и восстановления доступа.
- Нет платёжного провайдера. Кнопки тарифов ничего не списывают.
- Демо-данные вымышлены. ИНН, ОГРН и банк не относятся к реальной организации.
- Шрифты PDF лежат в `apps/api/assets/fonts` (Noto Sans, лицензия OFL).
