import { assertDedicatedTestDatabase } from '../../../test/support/test-database.guard.js';

describe('ATDD database fail-closed guard', () => {
  it.each([
    [{ NODE_ENV: 'development', DB_DATABASE: 'aims_test' }, /NODE_ENV=test/],
    [{ NODE_ENV: 'test', DB_DATABASE: 'aims' }, /dedicated test database/],
    [{ NODE_ENV: 'test', DB_DATABASE: '' }, /dedicated test database/],
    [
      {
        NODE_ENV: 'test',
        DB_DATABASE: 'aims_test',
        DB_DEVELOPMENT_DATABASE: 'aims_test',
      },
      /identical/,
    ],
  ])('rejects unsafe environment %j', (env, error) => {
    expect(() => assertDedicatedTestDatabase(env)).toThrow(error);
  });

  it('accepts an explicitly isolated test database', () => {
    expect(() =>
      assertDedicatedTestDatabase({
        NODE_ENV: 'test',
        DB_DATABASE: 'aims_auth_test',
        DB_DEVELOPMENT_DATABASE: 'aims',
      }),
    ).not.toThrow();
  });
});
