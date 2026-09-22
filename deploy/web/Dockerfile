# Serves the prebuilt React app (build frontend locally: cd frontend && npm run build)
FROM nginx:alpine
COPY deploy/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY frontend/build /usr/share/nginx/html
EXPOSE 80
