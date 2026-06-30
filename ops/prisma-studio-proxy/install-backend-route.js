const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appPath = path.join(root, 'src', 'app.js');
const serverPath = path.join(root, 'src', 'server.js');

function writeIfChanged(filePath, content) {
  const current = fs.readFileSync(filePath, 'utf8');
  if (current !== content) {
    fs.writeFileSync(filePath, content);
  }
}

let app = fs.readFileSync(appPath, 'utf8');

if (!app.includes("require('./routes/prismaStudioRoute')")) {
  app = app.replace(
    "const eventRoutes = require('./routes/eventRoutes');",
    "const eventRoutes = require('./routes/eventRoutes');\nconst { prismaStudioRoute } = require('./routes/prismaStudioRoute');"
  );
}

if (!app.includes('app.use(prismaStudioRoute);')) {
  app = app.replace(
    "app.use(cors());\napp.use(express.json({ limit: '5mb' }));",
    "app.use(cors());\napp.use(prismaStudioRoute);\napp.use(express.json({ limit: '5mb' }));"
  );
}

writeIfChanged(appPath, app);

let server = fs.readFileSync(serverPath, 'utf8');

if (!server.includes("require('./routes/prismaStudioRoute')")) {
  server = server.replace(
    "const app = require('./app');",
    "const app = require('./app');\nconst { attachPrismaStudioUpgrade } = require('./routes/prismaStudioRoute');"
  );
}

server = server.replace(
  /app\.listen\(PORT, \(\) => \{\n  console\.log\(\n    `Servidor rodando na porta \$\{PORT\}`\n  \);\n\}\);/,
  "const server = app.listen(PORT, () => {\n  console.log(\n    `Servidor rodando na porta ${PORT}`\n  );\n});\n\nattachPrismaStudioUpgrade(server);"
);

writeIfChanged(serverPath, server);
