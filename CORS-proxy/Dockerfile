FROM node:slim
COPY ./package.json ./package.json
COPY ./package-lock.json ./package-lock.json
RUN npm ci
COPY ./lib/ ./lib
COPY ./server.js ./server.js
CMD [ "node", "server.js"]
