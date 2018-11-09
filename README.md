Apt-Finder
==========

Инсталейшон
-----------

🤪 Node.js ≥ 10
👾 MongoDB ≥ 4

Mac
```
brew install pkg-config cairo libpng jpeg giflib
npm ci
```

Ubuntu
```
sudo apt-get install libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev build-essential g++
npm ci
```

Инструменты
-----------

pm2


Конфигурация
------------

Деплой
------

Запушить изменения в мастер и выполнить в корне проекта команду

```sh
pm2 deploy production update
```

Подробнее: https://pm2.io/doc/en/runtime/guide/easy-deploy-with-ssh/


Мэджик
------

1. Пакет `node-gyp` требует Python 2.7.
  __Лечение__:
```js
npm config set python '/usr/bin/python2.7'
```

2. pm2 открывает неинтерактивный шел для деплоя, поэтому строчки про подключение nvm находятся в самом верху `.bashrc` до проверки про интерактивность.

```sh
# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# If not running interactively, don't do anything
case $- in
    *i*) ;;
      *) return;;
esac

# ...
```
