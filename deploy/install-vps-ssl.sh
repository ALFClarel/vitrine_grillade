#!/usr/bin/env bash
# Installation isolée du site statique et de son certificat Let's Encrypt.
# À exécuter en root uniquement après déploiement des fichiers publics.
set -euo pipefail

domain="pouletgillettekwaye.re"
www_domain="www.pouletgillettekwaye.re"
email="pouletgilettekwaye@gmail.com"
site_root="/home/deploy/pouletgillettekwaye.re/current"
nginx_available="/etc/nginx/sites-available/pouletgillettekwaye.re"
nginx_enabled="/etc/nginx/sites-enabled/pouletgillettekwaye.re"
log_file="/home/deploy/pouletgillettekwaye.re/install-vps-ssl.log"

exec > >(tee -a "${log_file}") 2>&1

if [[ "${EUID}" -ne 0 ]]; then
  printf 'Erreur : exécuter ce script avec sudo.\n' >&2
  exit 1
fi

if [[ ! -f "${site_root}/index.html" ]]; then
  printf 'Erreur : %s/index.html est absent.\n' "${site_root}" >&2
  exit 1
fi

if [[ -e "${nginx_available}" || -e "${nginx_enabled}" || -L "${nginx_enabled}" ]]; then
  printf 'Erreur : une configuration dédiée existe déjà. Vérification manuelle requise.\n' >&2
  exit 1
fi

rollback() {
  printf '\nÉchec : retour à la configuration Nginx précédente.\n' >&2
  rm -f -- "${nginx_enabled}" "${nginx_available}"
  nginx -t && systemctl reload nginx || true
}
trap rollback ERR

install -d -m 0755 "${site_root}/.well-known/acme-challenge"

cat > "${nginx_available}" <<'NGINX_BOOTSTRAP'
server {
    listen 80;
    listen [::]:80;
    server_name pouletgillettekwaye.re www.pouletgillettekwaye.re;

    root /home/deploy/pouletgillettekwaye.re/current;
    index index.html;
    charset utf-8;

    access_log /var/log/nginx/pouletgillettekwaye.re.access.log;
    error_log  /var/log/nginx/pouletgillettekwaye.re.error.log warn;

    location ^~ /.well-known/acme-challenge/ {
        default_type text/plain;
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
NGINX_BOOTSTRAP

ln -s "${nginx_available}" "${nginx_enabled}"
nginx -t
systemctl reload nginx

curl --fail --silent --show-error --resolve "${domain}:80:127.0.0.1" "http://${domain}/" --output /dev/null

if [[ -f "/etc/letsencrypt/live/${domain}/fullchain.pem" && -f "/etc/letsencrypt/live/${domain}/privkey.pem" ]]; then
  printf 'Certificat existant détecté : nouvelle émission ignorée.\n'
else
  certbot certonly \
    --webroot \
    --webroot-path "${site_root}" \
    --domain "${domain}" \
    --domain "${www_domain}" \
    --cert-name "${domain}" \
    --email "${email}" \
    --agree-tos \
    --non-interactive
fi

certificate_names="$(openssl x509 -in "/etc/letsencrypt/live/${domain}/fullchain.pem" -noout -ext subjectAltName)"
grep -Fq "DNS:${domain}" <<< "${certificate_names}"
grep -Fq "DNS:${www_domain}" <<< "${certificate_names}"
printf 'Certificat vérifié pour %s et %s.\n' "${domain}" "${www_domain}"

cat > "${nginx_available}" <<'NGINX_FINAL'
server {
    listen 80;
    listen [::]:80;
    server_name pouletgillettekwaye.re www.pouletgillettekwaye.re;

    root /home/deploy/pouletgillettekwaye.re/current;

    location ^~ /.well-known/acme-challenge/ {
        default_type text/plain;
        try_files $uri =404;
    }

    location / {
        return 301 https://pouletgillettekwaye.re$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name pouletgillettekwaye.re www.pouletgillettekwaye.re;

    root /home/deploy/pouletgillettekwaye.re/current;
    index index.html;
    charset utf-8;
    server_tokens off;

    ssl_certificate /etc/letsencrypt/live/pouletgillettekwaye.re/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pouletgillettekwaye.re/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    access_log /var/log/nginx/pouletgillettekwaye.re.access.log;
    error_log  /var/log/nginx/pouletgillettekwaye.re.error.log warn;

    if ($host = www.pouletgillettekwaye.re) {
        return 301 https://pouletgillettekwaye.re$request_uri;
    }

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "DENY" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests" always;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/css text/javascript application/javascript application/manifest+json application/xml image/svg+xml;

    location / {
        try_files $uri $uri/ =404;
    }

    error_page 404 /404.html;
    location = /404.html {
        internal;
    }

    location ~* \.(?:avif|webp)$ {
        types {
            image/avif avif;
            image/webp webp;
        }
        try_files $uri =404;
        expires 1y;
    }

    location ~* \.(?:svg|css|js)$ {
        try_files $uri =404;
        expires 1y;
    }

    location = /site.webmanifest {
        default_type application/manifest+json;
        try_files $uri =404;
        expires -1;
    }

    location ~* \.(?:html|xml|txt)$ {
        try_files $uri =404;
        expires -1;
    }

    location ~ /\. {
        deny all;
    }
}
NGINX_FINAL

nginx -t
systemctl reload nginx

wait_for_https() {
  local host="$1"
  local attempt

  for attempt in {1..15}; do
    if curl --fail --silent --show-error --resolve "${host}:443:127.0.0.1" "https://${host}/" --output /dev/null; then
      printf 'HTTPS prêt pour %s après %s tentative(s).\n' "${host}" "${attempt}"
      return 0
    fi
    sleep 1
  done

  printf 'Erreur : HTTPS ne présente pas le bon certificat pour %s.\n' "${host}" >&2
  return 1
}

wait_for_https "${domain}"
wait_for_https "${www_domain}"

trap - ERR
printf '\nInstallation terminée : https://%s/\n' "${domain}"
