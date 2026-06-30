FROM node:24-bookworm-slim

WORKDIR /app
COPY server.js /app/server.js

ENV PORT=5556
ENV TARGET_URL=http://prisma-studio:5555

EXPOSE 5556
CMD ["node", "server.js"]
