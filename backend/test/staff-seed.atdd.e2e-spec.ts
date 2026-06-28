import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { JWT_TEST_SECRET } from './support/auth-atdd-fixture';
import { assertDedicatedTestDatabase } from './support/test-database.guard';

type StaffSeedConfig = {
  admin: { username: string; email: string; password: string };
  productManager: { username: string; email: string; password: string };
  bcryptRounds: number;
};

type StaffSeedModule = {
  seedStaffAccounts(
    dataSource: DataSource,
    config: StaffSeedConfig,
  ): Promise<void>;
  readStaffSeedConfig(env: NodeJS.ProcessEnv): StaffSeedConfig | null;
};

describe('Story 5.3 secure staff seed (ATDD integration)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const runId = randomUUID().replaceAll('-', '').slice(0, 12);
  const usernames: string[] = [];

  const loadSeedModule = async (): Promise<StaffSeedModule> => {
    return require('../src/auth/seed/staff-seed.js') as StaffSeedModule;
  };

  const config = (suffix: string): StaffSeedConfig => {
    const value = {
      admin: {
        username: `atdd_seed_admin_${runId}_${suffix}`,
        email: `atdd_seed_admin_${runId}_${suffix}@example.test`,
        password: 'SeedAdminPassword1',
      },
      productManager: {
        username: `atdd_seed_manager_${runId}_${suffix}`,
        email: `atdd_seed_manager_${runId}_${suffix}@example.test`,
        password: 'SeedManagerPassword1',
      },
      bcryptRounds: 10,
    };
    usernames.push(value.admin.username, value.productManager.username);
    return value;
  };

  beforeAll(async () => {
    assertDedicatedTestDatabase();
    process.env.JWT_SECRET = JWT_TEST_SECRET;
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    if (dataSource && usernames.length > 0) {
      await dataSource.query(
        'DELETE FROM users WHERE username = ANY($1::varchar[])',
        [[...new Set(usernames)]],
      );
    }
    if (app) await app.close();
  });

  it('[P1] requires all six credential variables or skips only when all are absent', async () => {
    const { readStaffSeedConfig } = await loadSeedModule();
    expect(readStaffSeedConfig({})).toBeNull();
    expect(() =>
      readStaffSeedConfig({
        STAFF_ADMIN_USERNAME: 'admin',
        STAFF_ADMIN_EMAIL: 'admin@example.test',
      }),
    ).toThrow(/complete|six|configuration/i);
  });

  it('[P1] creates both roles and active staff with bcrypt hashes without logging credentials', async () => {
    const { seedStaffAccounts } = await loadSeedModule();
    const seedConfig = config('create');
    const log = jest.spyOn(console, 'log').mockImplementation();
    const error = jest.spyOn(console, 'error').mockImplementation();

    await seedStaffAccounts(dataSource, seedConfig);

    const rows = await dataSource.query(
      `SELECT u.username, u.email, u.password_hash, u.status, r.role_name
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.user_id
       JOIN roles r ON r.role_id = ur.role_id
       WHERE u.username = ANY($1::varchar[])
       ORDER BY u.username`,
      [[seedConfig.admin.username, seedConfig.productManager.username]],
    );
    expect(rows).toHaveLength(2);
    expect(
      rows.map((row: Record<string, string>) => row.role_name).sort(),
    ).toEqual(['ADMIN', 'PRODUCT_MANAGER']);
    for (const row of rows) {
      expect(row.status).toBe('ACTIVE');
      expect(row.password_hash).toMatch(/^\$2[aby]\$10\$/);
      expect(row.password_hash).not.toBe(seedConfig.admin.password);
      expect(row.password_hash).not.toBe(seedConfig.productManager.password);
    }
    const output = [...log.mock.calls, ...error.mock.calls].flat().join(' ');
    expect(output).not.toContain(seedConfig.admin.password);
    expect(output).not.toContain(seedConfig.productManager.password);
  });

  it('[P1] is idempotent and preserves hashes and statuses on an active rerun', async () => {
    const { seedStaffAccounts } = await loadSeedModule();
    const seedConfig = config('idempotent');
    await seedStaffAccounts(dataSource, seedConfig);
    const before = await snapshot(seedConfig);

    await seedStaffAccounts(dataSource, seedConfig);

    const after = await snapshot(seedConfig);
    expect(after).toEqual(before);
    expect(after).toHaveLength(2);
  });

  it('[P1] rejects a configured-password mismatch without rotating the existing hash', async () => {
    const { seedStaffAccounts } = await loadSeedModule();
    const seedConfig = config('mismatch');
    await seedStaffAccounts(dataSource, seedConfig);
    const before = await snapshot(seedConfig);

    await expect(
      seedStaffAccounts(dataSource, {
        ...seedConfig,
        admin: { ...seedConfig.admin, password: 'DifferentSeedPassword1' },
      }),
    ).rejects.toThrow();
    expect(await snapshot(seedConfig)).toEqual(before);
  });

  it.each(['BLOCKED', 'DEACTIVATED'])(
    '[P1] rejects existing %s staff without reactivating or changing hashes',
    async (status) => {
      const { seedStaffAccounts } = await loadSeedModule();
      const seedConfig = config(status.toLowerCase());
      await seedStaffAccounts(dataSource, seedConfig);
      await dataSource.query(
        'UPDATE users SET status = $2 WHERE username = $1',
        [seedConfig.admin.username, status],
      );
      const before = await snapshot(seedConfig);

      await expect(seedStaffAccounts(dataSource, seedConfig)).rejects.toThrow();
      expect(await snapshot(seedConfig)).toEqual(before);
    },
  );

  it('[P1] rolls back both staff inserts and role joins when the second identity conflicts', async () => {
    const { seedStaffAccounts } = await loadSeedModule();
    const seedConfig = config('rollback');
    const conflictingUserId = randomUUID();
    const conflictingUsername = `atdd_seed_conflict_${runId}`;
    usernames.push(conflictingUsername);
    await dataSource.query(
      `INSERT INTO users (user_id, username, email, password_hash, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE')`,
      [
        conflictingUserId,
        conflictingUsername,
        seedConfig.productManager.email,
        '$2b$10$invalid-but-existing-hash-for-rollback-test',
      ],
    );

    await expect(seedStaffAccounts(dataSource, seedConfig)).rejects.toThrow();

    const inserted = await dataSource.query(
      'SELECT username FROM users WHERE username = ANY($1::varchar[])',
      [[seedConfig.admin.username, seedConfig.productManager.username]],
    );
    expect(inserted).toEqual([]);
    const conflictOwner = await dataSource.query(
      'SELECT user_id, status FROM users WHERE username = $1',
      [conflictingUsername],
    );
    expect(conflictOwner).toEqual([
      { user_id: conflictingUserId, status: 'ACTIVE' },
    ]);
  });

  async function snapshot(seedConfig: StaffSeedConfig): Promise<unknown[]> {
    return dataSource.query(
      `SELECT u.username, u.email, u.password_hash, u.status, r.role_name
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.user_id
       JOIN roles r ON r.role_id = ur.role_id
       WHERE u.username = ANY($1::varchar[])
       ORDER BY u.username, r.role_name`,
      [[seedConfig.admin.username, seedConfig.productManager.username]],
    );
  }
});
