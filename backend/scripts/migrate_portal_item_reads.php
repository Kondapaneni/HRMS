<?php
$envFile = __DIR__ . '/../.env';
if (!file_exists($envFile)) {
    die("Error: .env file not found\n");
}

$env = file_get_contents($envFile);
$vars = [];
foreach (explode("\n", $env) as $line) {
    $line = trim($line);
    if ($line && strpos($line, '=') !== false && strpos($line, '#') !== 0) {
        list($key, $value) = explode('=', $line, 2);
        $vars[trim($key)] = trim($value);
    }
}

$host = $vars['DB_HOST'] ?? 'localhost';
$port = $vars['DB_PORT'] ?? '5432';
$database = $vars['DB_DATABASE'] ?? 'postgres';
$username = $vars['DB_USERNAME'] ?? 'postgres';
$password = $vars['DB_PASSWORD'] ?? '';

try {
    $connection = new PDO(
        "pgsql:host=$host;port=$port;dbname=$database",
        $username,
        $password,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $readCountBefore = 0;
    foreach (['portal_item_reads', 'loan_application_reads', 'branch_operations_application_reads'] as $tableName) {
        $tableExists = $connection->query(
            "SELECT to_regclass('public.$tableName')"
        )->fetchColumn();
        if ($tableExists !== null) {
            $readCountBefore = (int)$connection->query(
                "SELECT COUNT(*) FROM public.$tableName"
            )->fetchColumn();
            break;
        }
    }

    $connection->exec("
        DO \$\$
        BEGIN
            IF to_regclass('public.portal_item_reads') IS NULL THEN
                IF to_regclass('public.loan_application_reads') IS NOT NULL THEN
                    ALTER TABLE public.loan_application_reads RENAME TO portal_item_reads;
                ELSIF to_regclass('public.branch_operations_application_reads') IS NOT NULL THEN
                    ALTER TABLE public.branch_operations_application_reads RENAME TO portal_item_reads;
                END IF;
            END IF;
        END
        \$\$;

        CREATE TABLE IF NOT EXISTS public.portal_item_reads (
            user_id UUID NOT NULL,
            portal_key VARCHAR(100) NOT NULL,
            item_type VARCHAR(100) NOT NULL,
            item_id TEXT NOT NULL,
            last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
            seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, portal_key, item_type, item_id)
        );

        DO \$\$
        DECLARE
            primary_key_name TEXT;
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'portal_item_reads'
                  AND column_name = 'last_seen_transfer_at'
            ) AND NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'portal_item_reads'
                  AND column_name = 'last_seen_at'
            ) THEN
                ALTER TABLE public.portal_item_reads
                RENAME COLUMN last_seen_transfer_at TO last_seen_at;
            END IF;

            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'portal_item_reads'
                  AND column_name = 'application_id'
            ) AND NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'portal_item_reads'
                  AND column_name = 'item_id'
            ) THEN
                ALTER TABLE public.portal_item_reads
                RENAME COLUMN application_id TO item_id;
            END IF;

            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'portal_item_reads'
                  AND column_name = 'item_id'
                  AND data_type <> 'text'
            ) THEN
                ALTER TABLE public.portal_item_reads
                ALTER COLUMN item_id TYPE TEXT USING item_id::text;
            END IF;

            ALTER TABLE public.portal_item_reads
                ADD COLUMN IF NOT EXISTS portal_key VARCHAR(100) NOT NULL DEFAULT 'branch_operations';
            ALTER TABLE public.portal_item_reads
                ADD COLUMN IF NOT EXISTS item_type VARCHAR(100) NOT NULL DEFAULT 'loan_application';
            ALTER TABLE public.portal_item_reads
                ALTER COLUMN portal_key DROP DEFAULT,
                ALTER COLUMN item_type DROP DEFAULT;

            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conrelid = 'public.portal_item_reads'::regclass
                  AND contype = 'p'
                  AND pg_get_constraintdef(oid) = 'PRIMARY KEY (user_id, portal_key, item_type, item_id)'
            ) THEN
                SELECT conname INTO primary_key_name
                FROM pg_constraint
                WHERE conrelid = 'public.portal_item_reads'::regclass
                  AND contype = 'p';

                IF primary_key_name IS NOT NULL THEN
                    EXECUTE format(
                        'ALTER TABLE public.portal_item_reads DROP CONSTRAINT %I',
                        primary_key_name
                    );
                END IF;

                ALTER TABLE public.portal_item_reads
                ADD CONSTRAINT portal_item_reads_pkey
                PRIMARY KEY (user_id, portal_key, item_type, item_id);
            END IF;
        END
        \$\$;
    ");

    $columnStmt = $connection->query("
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'portal_item_reads'
    ");
    $columns = $columnStmt->fetchAll(PDO::FETCH_COLUMN);
    foreach (['portal_key', 'item_type', 'item_id', 'last_seen_at'] as $requiredColumn) {
        if (!in_array($requiredColumn, $columns, true)) {
            throw new RuntimeException("The portal item read-state schema is missing the $requiredColumn column.");
        }
    }

    $readCountAfter = (int)$connection->query(
        'SELECT COUNT(*) FROM public.portal_item_reads'
    )->fetchColumn();
    if ($readCountAfter !== $readCountBefore) {
        throw new RuntimeException('The portal item migration did not preserve all existing read-state records.');
    }

    $defaultsStmt = $connection->query("
        SELECT COUNT(*)
        FROM pg_attrdef d
        JOIN pg_class t ON t.oid = d.adrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'portal_item_reads'
          AND pg_get_expr(d.adbin, d.adrelid) IN ('''branch_operations''::character varying', '''loan_application''::character varying')
    ");
    if ((int)$defaultsStmt->fetchColumn() !== 0) {
        throw new RuntimeException('Portal and item type columns must not default to a specific portal or entity.');
    }

    foreach (['loan_application_reads', 'branch_operations_application_reads'] as $legacyTableName) {
        $legacyTable = $connection->query(
            "SELECT to_regclass('public.$legacyTableName')"
        )->fetchColumn();
        if ($legacyTable !== null) {
            throw new RuntimeException("The legacy $legacyTableName table still exists.");
        }
    }

    echo "Successfully created/verified public.portal_item_reads; $readCountAfter read-state records preserved.\n";
} catch (PDOException $error) {
    fwrite(STDERR, "Database error: " . $error->getMessage() . "\n");
    exit(1);
}
