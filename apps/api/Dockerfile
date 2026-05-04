FROM node:22-slim
WORKDIR /app

RUN npm init -y && npm install @node-rs/argon2@^2.0.2 @libsql/client@^0.17.0

COPY dist/index.mjs ./dist/index.mjs

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.mjs"]
