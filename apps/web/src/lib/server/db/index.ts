import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';

let _db: ReturnType<typeof drizzle> | undefined;

export function getDb() {
	if (!_db) {
		if (!env.TURSO_DATABASE_URL) throw new Error('TURSO_DATABASE_URL is not set');
		const client = createClient({
			url: env.TURSO_DATABASE_URL,
			authToken: env.TURSO_AUTH_TOKEN
		});
		_db = drizzle(client);
	}
	return _db;
}
