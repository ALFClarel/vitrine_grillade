#!/usr/bin/env bash
# Audit strictement en lecture seule. Ce script ne supprime, ne déplace,
# ne redémarre et ne recharge rien.
set -u

protected_pattern='flammeo|pitonjdm|jamlink'

section() {
  printf '\n==== %s ====\n' "$1"
}

section "Identité du serveur"
date --iso-8601=seconds 2>/dev/null || date
hostnamectl 2>/dev/null || hostname
uname -a
printf 'Répertoire courant : %s\n' "$PWD"

section "Capacité"
df -hT
free -h 2>/dev/null || true
uptime

section "Services protégés détectés"
systemctl list-units --all --no-pager 2>/dev/null | grep -Ei "$protected_pattern" || printf 'Aucune unité correspondante visible.\n'
ps aux 2>/dev/null | grep -Ei "$protected_pattern" | grep -v grep || printf 'Aucun processus correspondant visible.\n'

section "Conteneurs existants — lecture seule"
if command -v docker >/dev/null 2>&1; then
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || true
  printf '\nOccupation Docker :\n'
  docker system df 2>/dev/null || true
else
  printf 'Docker non installé ou inaccessible.\n'
fi

section "Ports en écoute"
ss -lntup 2>/dev/null || netstat -lntup 2>/dev/null || true

section "Nginx — état et domaines connus"
nginx -v 2>&1 || true
systemctl is-active nginx 2>/dev/null || true
if command -v nginx >/dev/null 2>&1; then
  nginx -T 2>/dev/null | grep -En 'server_name|listen|root' || true
fi

section "Répertoires web"
find /var/www -mindepth 1 -maxdepth 3 -type d -printf '%p\n' 2>/dev/null | sort || true
du -x -h --max-depth=2 /var/www 2>/dev/null | sort -h | tail -n 30 || true

section "Scripts de nettoyage présents près du répertoire d’arrivée"
find "$PWD" -maxdepth 2 -type f \( -iname '*clean*.sh' -o -iname '*cleanup*.sh' -o -iname '*purge*.sh' \) -print 2>/dev/null || true

section "Candidats possibles au nettoyage — mesures uniquement"
du -sh /var/cache/apt /var/log 2>/dev/null || true
journalctl --disk-usage 2>/dev/null || true
find /tmp -mindepth 1 -maxdepth 1 -printf '%TY-%Tm-%Td %p\n' 2>/dev/null | sort | head -n 40 || true

section "Contrôle final"
printf 'Audit terminé. Aucune modification n’a été effectuée.\n'
printf 'Ne pas exécuter de nettoyage avant validation explicite de chaque cible.\n'
