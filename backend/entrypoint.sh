#!/usr/bin/env bash
set -e

echo "Waiting for the database…"
until python -c "
import os, sys
from urllib.parse import urlparse
import psycopg2
url = urlparse(os.environ['DATABASE_URL'])
try:
    psycopg2.connect(
        dbname=url.path.lstrip('/'), user=url.username,
        password=url.password, host=url.hostname, port=url.port or 5432,
    ).close()
except Exception as exc:
    print(exc, file=sys.stderr)
    sys.exit(1)
" 2>/dev/null; do
  sleep 1
done
echo "Database is up."

python manage.py migrate --noinput
python manage.py collectstatic --noinput

if [ "${SEED_DEMO:-false}" = "true" ]; then
  python manage.py seed_demo || true
fi

exec "$@"
