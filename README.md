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

Мэджик
------

1. Пакет `node-gyp` требует Python 2.7.
  __Лечение__:
```js
npm config set python '/usr/bin/python2.7'
```
