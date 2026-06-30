const http = require('http');
const net = require('net');
const { URL } = require('url');
const express = require('express');

const router = express.Router();

const target = new URL(
  process.env.PRISMA_STUDIO_TARGET_URL || 'http://prisma-studio:5555'
);
const authUser = process.env.PRISMA_STUDIO_USER || 'admin';
const authPassword = process.env.PRISMA_STUDIO_PASSWORD;
const realm = 'Prisma Studio';

function isEnabled() {
  return Boolean(authPassword);
}

function isAuthorized(req) {
  const header = req.headers.authorization || '';
  const expected = Buffer.from(`${authUser}:${authPassword}`).toString('base64');
  return header === `Basic ${expected}`;
}

function rejectUnauthorized(res) {
  res.set('WWW-Authenticate', `Basic realm="${realm}", charset="UTF-8"`);
  return res.status(401).send('Authentication required');
}

function copyHeaders(headers) {
  const copied = { ...headers };
  delete copied.host;
  delete copied.connection;
  delete copied['proxy-connection'];
  delete copied['content-length'];
  return copied;
}

function isPrismaStudioRequest(req) {
  const url = req.originalUrl || req.url || '';
  return (
    url.startsWith('/prisma-studio') ||
    url.startsWith('/assets/') ||
    url.startsWith('/http/') ||
    url === '/index.css' ||
    url === '/favicon.svg' ||
    url === '/icon-1024.png' ||
    url === '/vendor.js' ||
    url === '/schema.prisma' ||
    url.startsWith('/prisma/') ||
    url.startsWith('/api')
  );
}

function targetPath(originalUrl) {
  if (originalUrl.startsWith('/prisma-studio')) {
    const path = originalUrl.replace(/^\/prisma-studio\/?/, '/');
    return path || '/';
  }

  return originalUrl || '/';
}

router.use((req, res, next) => {
  if (!isPrismaStudioRequest(req)) {
    return next();
  }

  if (!isEnabled()) {
    return res.status(404).send('Prisma Studio is not configured');
  }

  if (!isAuthorized(req)) {
    return rejectUnauthorized(res);
  }

  if (req.originalUrl === '/prisma-studio') {
    return res.redirect(308, '/prisma-studio/');
  }

  const proxyReq = http.request(
    {
      hostname: target.hostname,
      port: target.port || 80,
      path: targetPath(req.originalUrl),
      method: req.method,
      headers: {
        ...copyHeaders(req.headers),
        host: target.host,
        'x-forwarded-host': req.headers.host || '',
        'x-forwarded-proto': req.protocol || 'http',
      },
    },
    (proxyRes) => {
      res.status(proxyRes.statusCode || 502);
      Object.entries(proxyRes.headers).forEach(([key, value]) => {
        if (value !== undefined) {
          res.setHeader(key, value);
        }
      });
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', () => {
    res.status(502).send('Prisma Studio is unavailable');
  });

  req.pipe(proxyReq);
});

function attachPrismaStudioUpgrade(server) {
  server.on('upgrade', (req, socket, head) => {
    if (!req.url || !isPrismaStudioRequest(req)) {
      return;
    }

    if (!isEnabled() || !isAuthorized(req)) {
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
        .join('\r\n');

      upstream.write(
        `${req.method} ${targetPath(req.url)} HTTP/${req.httpVersion}\r\n${headers}\r\n\r\n`
      );
      if (head.length) {
        upstream.write(head);
      }
      socket.pipe(upstream).pipe(socket);
    });

    upstream.on('error', () => socket.destroy());
  });
}

module.exports = {
  prismaStudioRoute: router,
  attachPrismaStudioUpgrade,
};
