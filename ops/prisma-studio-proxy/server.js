const http = require("http");
const net = require("net");
const { URL } = require("url");

const port = Number(process.env.PORT || 5556);
const target = new URL(process.env.TARGET_URL || "http://prisma-studio:5555");
const authUser = process.env.BASIC_AUTH_USER || "admin";
const authPassword = process.env.BASIC_AUTH_PASSWORD;
const realm = process.env.BASIC_AUTH_REALM || "Prisma Studio";

if (!authPassword) {
  console.error("BASIC_AUTH_PASSWORD is required");
  process.exit(1);
}

function isAuthorized(req) {
  const header = req.headers.authorization || "";
  const expected = Buffer.from(`${authUser}:${authPassword}`).toString("base64");
  return header === `Basic ${expected}`;
}

function rejectUnauthorized(res) {
  res.writeHead(401, {
    "www-authenticate": `Basic realm="${realm}", charset="UTF-8"`,
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end("Authentication required");
}

function copyHeaders(headers) {
  const copied = { ...headers };
  delete copied.host;
  delete copied.connection;
  delete copied["proxy-connection"];
  delete copied["content-length"];
  return copied;
}

const server = http.createServer((req, res) => {
  if (!isAuthorized(req)) {
    rejectUnauthorized(res);
    return;
  }

  const proxyReq = http.request(
    {
      hostname: target.hostname,
      port: target.port || 80,
      path: req.url,
      method: req.method,
      headers: {
        ...copyHeaders(req.headers),
        host: target.host,
        "x-forwarded-host": req.headers.host || "",
        "x-forwarded-proto": "http",
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", () => {
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end("Prisma Studio is unavailable");
  });

  req.pipe(proxyReq);
});

server.on("upgrade", (req, socket, head) => {
  if (!isAuthorized(req)) {
    socket.write(
      `HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Basic realm="${realm}", charset="UTF-8"\r\nConnection: close\r\n\r\n`
    );
    socket.destroy();
    return;
  }

  const upstream = net.connect(Number(target.port || 80), target.hostname, () => {
    const headers = Object.entries({
      ...copyHeaders(req.headers),
      host: target.host,
    })
      .map(([key, value]) => `${key}: ${value}`)
      .join("\r\n");

    upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${headers}\r\n\r\n`);
    if (head.length) {
      upstream.write(head);
    }
    socket.pipe(upstream).pipe(socket);
  });

  upstream.on("error", () => socket.destroy());
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Prisma Studio proxy listening on ${port} -> ${target.href}`);
});
