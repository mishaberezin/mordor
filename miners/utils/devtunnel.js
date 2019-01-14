const http = require("http");
const httpProxy = require("http-proxy");
const localtunnel = require("localtunnel");

const httpAuth = require("http-auth");
const modifyResponse = require("http-proxy-response-rewrite");
const getPort = require("get-port");
const randomstring = require("randomstring");
const urlParse = require("url-parse");

/**
 * Create a proxy + tunnel to make a local devTools session accessible from the internet.
 *
 * - These devtools pages support screencasting the browser screen
 * - Proxy supports both http and websockets
 * - Proxy patches Host header to bypass devtools bug preventing non-localhost/ip access
 * - Proxy rewrites URLs, so links on the devtools index page will work
 * - Has a convenience function to return a deep link to a debug a specific page
 * - Supports basic auth ;-)
 *
 * @todo No idea how long-living a tunnel connection is yet, we might want to add keep-alive/reconnect capabilities
 *
 * @ignore
 */
class Tunnel {
  constructor(wsUrl, opts = {}) {
    this.opts = Object.assign(this.defaults, opts);
    this.wsUrl = wsUrl;

    const { hostname, port } = urlParse(this.wsUrl);

    this.wsHost = hostname === "127.0.0.1" ? "localhost" : hostname;
    this.wsPort = port;

    this.server = null;
    this.tunnel = {};
    this.tunnelHost = null;
  }

  get defaults() {
    return {
      user: "admin",
      pass: "admin"
    };
  }

  get url() {
    return this.tunnel.url;
  }

  pageUrl(pageId) {
    return `${this.url}/devtools/inspector.html?wss=${
      this.tunnelHost
    }/devtools/page/${pageId}`;
  }

  async create() {
    const subdomain = this.generateSubdomain();
    const basicAuth = this.createBasicAuth(this.opts.user, this.opts.pass);
    const serverPort = await getPort(9223); // only preference, will return an available one

    this.proxyServer = this._createProxyServer(this.wsHost, this.wsPort);
    this.server = await this._createServer(serverPort, basicAuth);
    this.tunnel = await this.createTunnel(this.wsHost, serverPort, subdomain);
    this.tunnelHost = urlParse(this.tunnel.url).hostname;

    return this;
  }

  close() {
    this.tunnel.close();
    this.server.close();
    this.proxyServer.close();
    return this;
  }

  generateSubdomain() {
    return randomstring.generate({
      length: 10,
      readable: true,
      capitalization: "lowercase"
    });
  }

  createBasicAuth(user, pass) {
    const basicAuth = httpAuth.basic({}, (username, password, callback) => {
      const isValid = username === user && password === pass;
      return callback(isValid);
    });
    basicAuth.on("fail", (result, req) => {
      console.error(`User authentication failed: ${result.user}`);
    });
    basicAuth.on("error", (error, req) => {
      console.error(
        `Authentication error: ${error.code + " - " + error.message}`
      );
    });
    return basicAuth;
  }

  /**
   * `fetch` used by the index page doesn't include credentials by default.
   *
   *           LOVELY
   *           THANKS
   *             <3
   *
   * @ignore
   */
  _modifyFetchToIncludeCredentials(body) {
    if (!body) {
      return;
    }
    body = body.replace(`fetch(url).`, `fetch(url, {credentials: 'include'}).`);
    return body;
  }

  _modifyJSONResponse(body) {
    if (!body) {
      return;
    }
    body = body.replace(new RegExp(this.wsHost, "g"), `${this.tunnelHost}`);
    body = body.replace(new RegExp("ws=", "g"), "wss=");
    body = body.replace(new RegExp("ws://", "g"), "wss://");
    return body;
  }

  _createProxyServer(targetHost = "localhost", targetPort) {
    const proxyServer = new httpProxy.createProxyServer({
      target: { host: targetHost, port: parseInt(targetPort) }
    });
    proxyServer.on("proxyReq", (proxyReq, req, res, options) => {
      // https://github.com/GoogleChrome/puppeteer/issues/2242
      proxyReq.setHeader("Host", "localhost");
    });
    proxyServer.on("proxyRes", (proxyRes, req, res, options) => {
      if (req.url === "/") {
        delete proxyRes.headers["content-length"];
        modifyResponse(
          res,
          proxyRes.headers["content-encoding"],
          this._modifyFetchToIncludeCredentials.bind(this)
        );
      }
      if (["/json/list", "/json/version"].includes(req.url)) {
        delete proxyRes.headers["content-length"];
        modifyResponse(
          res,
          proxyRes.headers["content-encoding"],
          this._modifyJSONResponse.bind(this)
        );
      }
    });
    return proxyServer;
  }

  async _createServer(port, auth = null) {
    const server = http.createServer(auth, (req, res) => {
      this.proxyServer.web(req, res);
    });
    server.on("upgrade", (req, socket, head) => {
      this.proxyServer.ws(req, socket, head);
    });
    server.listen(port);
    return server;
  }

  async createTunnel(host, port, subdomain = null) {
    return new Promise((resolve, reject) => {
      const tunnel = localtunnel(
        port,
        { local_host: host, subdomain },
        (err, tunnel) => {
          if (err) {
            return reject(err);
          }
          console.log("tunnel:created", tunnel.url);
          return resolve(tunnel);
        }
      );
      tunnel.on("close", () => {
        console.log("tunnel:close");
      });
    });
  }
}

module.exports = browser => {
  browser.tunnel = async () => {
    let tunnel;

    if (browser._tunnel) {
      tunnel = browser._tunnel;
    } else {
      tunnel = new Tunnel(browser.wsEndpoint());
      await tunnel.create();
      browser._tunnel = tunnel;
    }

    return tunnel.url;
  };

  browser.on("pagecreated", page => {
    page.tunnel = async () => {
      if (!browser._tunnel) {
        await browser.tunnel();
      }

      const tunnel = browser._tunnel;
      const pageId = page._target._targetInfo.targetId;

      return tunnel.pageUrl(pageId);
    };
  });
};

const devtunnel = async browser => {
  if (browser._tunnel) {
    return browser._tunnel;
  } else {
    const tunnel = new Tunnel(browser.wsEndpoint());
    await tunnel.create();
    browser._tunnel = tunnel;
    return tunnel;
  }
};

module.exports = async guess => {
  const page = guess.goto ? guess : null;
  const browser = page ? await page.browser() : guess;
  const tunnel = await devtunnel(browser);

  if (page) {
    const pageId = page._target._targetInfo.targetId;
    return tunnel.pageUrl(pageId);
  } else {
    return tunnel.url;
  }
};
