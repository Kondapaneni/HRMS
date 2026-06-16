#!/bin/bash
# docker-entrypoint.sh
# This script passes OS environment variables to Apache so PHP can read them.
# Apache clears the environment for child processes by default, so we need to
# explicitly export them via Apache's envvars file.

ENV_VARS="DB_HOST DB_PORT DB_DATABASE DB_USERNAME DB_PASSWORD JWT_SECRET GOOGLE_MAPS_API_KEY GOOGLE_GEOCODING_API_KEY FRONTEND_URL"

for var in $ENV_VARS; do
  val=$(printenv "$var" 2>/dev/null)
  if [ -n "$val" ]; then
    echo "export $var=\"$val\"" >> /etc/apache2/envvars
  fi
done

# Start Apache in foreground
exec apache2-foreground
