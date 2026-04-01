FROM node:20-alpine
WORKDIR /app

COPY package.json ./package.json
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY .npmrc ./.npmrc
COPY backend/.npmrc ./backend/.npmrc
COPY frontend/.npmrc ./frontend/.npmrc

RUN npm install && npm --prefix backend install && npm --prefix frontend install

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "start"]
