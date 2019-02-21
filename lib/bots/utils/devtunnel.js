const http = require("http");
const httpProxy = require("http-proxy");

const ngrok = require("ngrok");

const modifyResponse = require("http-proxy-response-rewrite");
const getPort = require("get-port");
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
  constructor(wsurl) {
    this.wsHost = "localhost";
    this.wsPort = parseInt(urlParse(wsurl).port);

    return this.init();
  }

  async init() {
    const serverPort = parseInt(await getPort());

    this.proxyServer = this.createProxyServer(this.wsHost, this.wsPort);
    this.localServer = this.createLocalServer(serverPort);
    this.tunnelUrl = await ngrok.connect(serverPort);
    this.tunnelHost = urlParse(this.tunnelUrl).hostname;

    return this;
  }

  get url() {
    return this.tunnelUrl;
  }

  pageUrl(id) {
    return `${this.url}/devtools/inspector.html?wss=${
      this.tunnelHost
    }/devtools/page/${id}`;
  }

  async close() {
    this.proxyServer.close();
    this.localServer.close();
    await ngrok.disconnect(this.tunnelUrl);
    return this;
  }

  /**
   * `fetch` used by the index page doesn't include credentials by default.

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

  createProxyServer(host, port) {
    const proxyServer = new httpProxy.createProxyServer({
      target: { host, port }
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

  createLocalServer(port) {
    const server = http.createServer((req, res) => {
      this.proxyServer.web(req, res);
    });
    server.on("upgrade", (req, socket, head) => {
      this.proxyServer.ws(req, socket, head);
    });
    server.listen(port);

    return server;
  }
}

const devtunnel = async browser => {
  if (browser._tunnel) return browser._tunnel;

  const tunnel = await new Tunnel(browser.wsEndpoint());
  browser._tunnel = tunnel;

  return tunnel;
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
