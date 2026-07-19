# Déploiement VPS — pouletgillettekwaye.re

Cette procédure installe le site directement sous Nginx, sans Docker et dans un chemin réservé au domaine. Elle ne modifie pas les applications Flammeo, PitonJDM ou Jamlink.

## Garde-fous obligatoires

1. Exécuter `preflight-vps.sh` en lecture seule et conserver sa sortie.
2. Identifier les ports, conteneurs, unités systemd, répertoires et blocs Nginx de Flammeo, PitonJDM et Jamlink.
3. Ne jamais utiliser `docker system prune`, `docker volume prune`, une suppression récursive dans `/var/lib/docker`, `/var/www` ou `/etc/nginx`, ni un redémarrage global de Docker.
4. Créer uniquement `/var/www/pouletgillettekwaye.re` et un fichier Nginx portant le même domaine.
5. Toujours exécuter `nginx -t` avant un rechargement gracieux de Nginx.

## Arborescence recommandée

```text
/var/www/pouletgillettekwaye.re/
├── releases/
│   └── YYYYMMDD-HHMMSS/
└── current -> releases/YYYYMMDD-HHMMSS
```

Le lien `current` permet un retour arrière rapide vers la version précédente sans toucher aux autres sites.

## Fichiers publics à transférer

Transférer les fichiers HTML, CSS, JavaScript, XML, TXT, SVG, manifeste et `images/web/`. Les JPG sources, `.git`, `.agents` et le dossier `deploy` ne sont pas nécessaires en production. Le fichier `rsync-exclude.txt` décrit ces exclusions.

Exemple à adapter après l’audit du serveur :

```bash
rsync -av --delete-delay --exclude-from=deploy/rsync-exclude.txt ./ utilisateur@serveur:/var/www/pouletgillettekwaye.re/releases/YYYYMMDD-HHMMSS/
```

`--delete-delay` ne doit être utilisé que sur le nouveau répertoire de release dédié, jamais sur un répertoire partagé.

## Nginx et HTTPS

1. Copier `nginx-http.conf.example` vers un nouveau fichier dédié, par exemple `/etc/nginx/sites-available/pouletgillettekwaye.re`.
2. Activer uniquement ce fichier avec un lien dans `sites-enabled`.
3. Exécuter `nginx -t` ; si le test échoue, ne pas recharger Nginx.
4. Recharger gracieusement avec `systemctl reload nginx` uniquement après validation.
5. Quand les DNS A/AAAA pointent vers le VPS, obtenir le certificat avec Certbot pour `pouletgillettekwaye.re` et `www.pouletgillettekwaye.re`.
6. Refaire `nginx -t`, puis contrôler la redirection HTTP vers HTTPS, les en-têtes de sécurité et les types MIME AVIF/WebP.

## DNS du VPS OVH

Créer les enregistrements suivants pour le domaine racine :

```text
A     15.235.166.202
AAAA  2402:1f00:8000:800::34ab
```

Pour `www`, utiliser un CNAME vers `pouletgillettekwaye.re` ou les mêmes enregistrements A et AAAA. Les certificats TLS ne doivent être demandés qu’après propagation effective de ces DNS.

## Vérifications après publication

```bash
curl -I https://pouletgillettekwaye.re/
curl -I https://pouletgillettekwaye.re/images/web/grillades-ravine-des-cabris-640.avif
curl -fsS https://pouletgillettekwaye.re/robots.txt
curl -fsS https://pouletgillettekwaye.re/sitemap.xml
```

Vérifier ensuite le certificat, la page 404, les liens téléphone/e-mail, le menu mobile, les images, puis déclarer le domaine dans Google Search Console et Bing Webmaster Tools.

## Nettoyage du VPS

Le script `preflight-vps.sh` ne fait qu’inventorier les candidats. Toute commande de nettoyage doit être présentée avec sa cible exacte, son volume estimé, son impact et son moyen de retour arrière, puis recevoir une confirmation explicite avant exécution.
