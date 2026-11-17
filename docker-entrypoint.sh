#!/bin/bash
# docker-entrypoint.sh
# Generate a .env file from Render's OS environment variables so that
# PHP's Dotenv can load them into $_ENV. Apache strips OS env vars from
# child processes, and PHP's getenv() doesn't always work with envvars.

ENV_FILE="/var/www/html/.env"

# Only generate if .env doesn't already exist (i.e., we're on Render, not local dev)
if [ ! -f "$ENV_FILE" ]; then
  echo "# Auto-generated from environment variables at container startup" > "$ENV_FILE"

  ENV_VARS="DB_HOST DB_PORT DB_DATABASE DB_USERNAME DB_PASSWORD JWT_SECRET GOOGLE_MAPS_API_KEY GOOGLE_GEOCODING_API_KEY GOOGLE_MAPS_BROWSER_API_KEY FRONTEND_URL CORS_ALLOWED_ORIGINS VITE_SUPABASE_URL SUPABASE_URL SUPABASE_SECRET_KEY DB_PDO_PREPARE_MODE SEC018_NATIVE_SESSION_ENABLED SEC018_DB_USE_RESTRICTED SEC018_DB_USERNAME SEC018_DB_PASSWORD SEC018_AUDIT_CONTEXT_ENABLED SEC018_AUDIT_HMAC_KEY"

  for var in $ENV_VARS; do
    val=$(printenv "$var" 2>/dev/null)
    if [ -n "$val" ]; then
      # Use single quotes to prevent phpdotenv from interpreting $ and other specials
      # Escape any existing single quotes in the value
      escaped_val=$(printf '%s' "$val" | sed "s/'/'\\\\''/" )
      echo "${var}='${escaped_val}'" >> "$ENV_FILE"
    fi
  done

  chown www-data:www-data "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "Generated .env with environment variables."
else
  echo ".env file already exists, skipping generation."
fi

# Start Apache in foreground
exec apache2-foreground
