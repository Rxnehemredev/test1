import { register } from 'node:module';
register('./_alias-loader.mjs', import.meta.url);
// Test ortamında ağsız/in-memory rate limiting testlerine izin ver
process.env.ALLOW_IN_MEMORY_RATE_LIMIT = 'true';
