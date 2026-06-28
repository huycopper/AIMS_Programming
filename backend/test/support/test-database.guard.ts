export function assertDedicatedTestDatabase(env = process.env): void {
  const database = env.DB_DATABASE?.trim() ?? '';
  if (env.NODE_ENV !== 'test') {
    throw new Error('ATDD database setup requires NODE_ENV=test.');
  }
  if (!database || !/(^|[_-])test($|[_-])|test/i.test(database)) {
    throw new Error(
      `Refusing ATDD database setup: DB_DATABASE must identify a dedicated test database (received ${database || '<empty>'}).`,
    );
  }
  if (env.DB_DEVELOPMENT_DATABASE && database === env.DB_DEVELOPMENT_DATABASE) {
    throw new Error(
      'Refusing ATDD database setup: test and development databases are identical.',
    );
  }
}
