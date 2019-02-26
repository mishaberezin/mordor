## Инсталейшон

🤪 Node.js ≥ 10<br>
👾 MongoDB ≥ 4<br>
👻 PM2 ≥ 3

```sh
mongod
git clone
npm ci
```

Запустить одного из роботов можно так:

```sh
node app/api.js
node app/cian-crawler.js
```

Хотя без секретов, наверное, не запустится 😳.

## Структура

```sh
.
├── .env (🔥 секреты, см. пакет dotenv)
├── .eslintrc.js
├── .gitignore
├── README.md
├── api (🔥 http ручки)
│   └── index.js
├── app (🔥 процессы, запускаются через pm2)
│   ├── api.js
│   ├── cian-checker.js
│   ├── cian-crawler.js
│   ├── digest.js
│   ├── realty-checker.js
│   ├── realty-crawler.js
│   └── report.js
├── config (🔥 конфигурация для разных окружений)
│   ├── default.js
│   └── production.js
├── ecosystem.config.js (🔥 конфиг для PM2, деплой/запуск)
├── lib (🔥 основной нодовый код проекта)
│   ├── bots (🔥 роботы)
│   ├── db (🔥 методы для работы с базой)
│   ├── fixup
│   ├── mordobot.js (🔥 телеграм бот)
│   └── utils
├── package-lock.json
└── package.json
```

## Дисклеймер

- Название `mordor` долгая история
- От Гитхаба нужны только хостинг + ревизии, так что коммит месаджи не смотреть 😳

## Деплой

Перед деплоем обязательно все запушить, затем:

```sh
pm2 deploy production update
```

Подробнее: https://pm2.io/doc/en/runtime/guide/easy-deploy-with-ssh/

## Рецепты

Обновить `.env`

```sh
scp .env ddml@host:~
```

## Мэджик

1. Пакет `node-gyp` требует Python 2.7.
   **Лечение**:

```js
npm config set python '/usr/bin/python2.7'
```

2. PM2 использует неинтерактивный шел для деплоя, поэтому строчки про подключение nvm находятся в самом верху `.bashrc` до проверки про интерактивность.
