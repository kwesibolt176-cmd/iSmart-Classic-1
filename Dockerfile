FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Vite inlines these at BUILD time. They are public values (anon key), not secrets.
# Pass them with --build-arg or via docker-compose `args`.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

# Copy the complete Vite application before running the production build.
# In particular, index.html imports /src/main.tsx, so src/ must exist in /app.
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY tailwind.config.ts postcss.config.js components.json ./
COPY public ./public
COPY src ./src

RUN test -f /app/src/main.tsx \
 && test -n "$VITE_SUPABASE_URL" \
 && test -n "$VITE_SUPABASE_PUBLISHABLE_KEY" \
 && npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
