const defaultLocalOrigins = [
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:4180',
  'http://localhost:4180'
];

export function getAllowedOrigins(value = process.env.CORS_ALLOWED_ORIGINS): string[] {
  if (!value) return defaultLocalOrigins;
  return value.split(',').map(origin => origin.trim()).filter(Boolean);
}
