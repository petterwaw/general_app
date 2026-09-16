FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/game-core/package.json ./packages/game-core/package.json

RUN pnpm install

COPY . .

RUN pnpm --filter @dice-app/game-core build
RUN pnpm --filter api exec prisma generate

CMD ["pnpm", "--filter", "api", "start:dev"]