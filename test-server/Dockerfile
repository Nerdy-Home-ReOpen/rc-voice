FROM node:20
WORKDIR /app
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install --frozen-lockfile
COPY index.js ./
COPY constant.js ./
COPY ./utils ./utils
COPY ./socket ./socket
CMD ["node", "index.js"]