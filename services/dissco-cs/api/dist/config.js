function toBool(value, defaultValue) {
    if (!value) {
        return defaultValue;
    }
    return ['true', '1', 'yes'].includes(value.toLowerCase());
}
function required(name, fallback) {
    const value = process.env[name] ?? fallback;
    if (value === undefined || value === '') {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
function requiredNumber(name, fallback) {
    const raw = process.env[name] ?? (fallback !== undefined ? String(fallback) : undefined);
    if (!raw) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    const value = Number(raw);
    if (Number.isNaN(value)) {
        throw new Error(`Invalid numeric environment variable: ${name}`);
    }
    return value;
}
function validateSchemaName(schema) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
        throw new Error(`Invalid PostgreSQL schema name: ${schema}`);
    }
    return schema;
}
export const appConfig = {
    host: process.env.HOST ?? '0.0.0.0',
    port: requiredNumber('PORT', 8000),
    migrate: toBool(process.env.MIGRATE, false),
    postgresHost: required('POSTGRES_HOST', 'shared-postgres'),
    postgresPort: requiredNumber('POSTGRES_PORT', 5432),
    postgresUser: required('POSTGRES_USER', 'postgres'),
    postgresPassword: required('POSTGRES_PASSWORD', 'postgres'),
    postgresDatabase: required('POSTGRES_DB', 'postgres'),
    postgresSchema: validateSchemaName(required('POSTGRES_SCHEMA', 'dissco_cs')),
    startupRetryMs: requiredNumber('STARTUP_RETRY_MS', 1000),
    startupRetryCount: requiredNumber('STARTUP_RETRY_COUNT', 120),
    madocGatewayUrl: process.env.MADOC_GATEWAY_URL ?? 'http://gateway:8080',
    madocServiceJwtPath: process.env.MADOC_SERVICE_JWT_PATH ?? '/app/service-jwt-responses/dissco-cs-api.json',
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
    smtpSecurity: process.env.SMTP_SECURITY,
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    mailFromUser: process.env.MAIL_FROM_USER,
};
