# Prisma Studio online

Este conjunto deixa o Prisma Studio do backend acessivel por uma URL publica com Basic Auth.

Arquitetura aplicada:

- `prisma-studio` continua rodando no Docker do backend, conectado ao banco real.
- O Studio fica interno em `127.0.0.1:5555` / rede Docker, sem exposicao direta.
- O backend Express publica `/prisma-studio/` na porta ja liberada `3001`.
- A rota `/prisma-studio` do Next/Vercel redireciona para a URL publica do backend.

Variaveis esperadas no container do backend:

- `PRISMA_STUDIO_TARGET_URL`: URL interna do Studio. Padrao: `http://prisma-studio:5555`.
- `PRISMA_STUDIO_USER`: usuario do acesso web. Padrao: `admin`.
- `PRISMA_STUDIO_PASSWORD`: senha do acesso web. Se nao existir, a rota responde `404`.

Arquivos:

- `prismaStudioRoute.js`: rota Express e handler de WebSocket.
- `install-backend-route.js`: instalador idempotente para aplicar a rota em `src/app.js` e `src/server.js` no backend.

O `Dockerfile` e `server.js` desta pasta sao uma opcao alternativa para publicar um proxy separado em outra porta, caso o servidor libere essa porta futuramente.

Comando de exemplo usado no backend:

```bash
docker run -d \
  --name afiliados-backend \
  --restart unless-stopped \
  --network afiliados-net \
  -p 0.0.0.0:3001:3001 \
  --env-file .env.docker.runtime \
  -e PRISMA_STUDIO_USER=admin \
  -e PRISMA_STUDIO_PASSWORD='troque-esta-senha' \
  -e PRISMA_STUDIO_TARGET_URL=http://prisma-studio:5555 \
  afiliados-backend:prisma-studio-online
```
