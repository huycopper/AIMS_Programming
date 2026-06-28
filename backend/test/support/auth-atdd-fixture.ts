import { randomUUID } from 'node:crypto';
import { hash } from 'bcrypt';
import { DataSource } from 'typeorm';
export { assertDedicatedTestDatabase } from './test-database.guard';

export const JWT_TEST_SECRET = 'atdd-only-secret-with-at-least-32-bytes';
export const DEFAULT_PASSWORD = 'ValidPassword1';
export const PASSWORD_72_ASCII_BYTES = `A1${'a'.repeat(70)}`;
export const PASSWORD_73_ASCII_BYTES = `${PASSWORD_72_ASCII_BYTES}b`;
export const PASSWORD_72_MULTIBYTE_BYTES = `A1${'é'.repeat(35)}`;
export const PASSWORD_73_MULTIBYTE_BYTES = `${PASSWORD_72_MULTIBYTE_BYTES}a`;

export type StaffStatus = 'ACTIVE' | 'BLOCKED' | 'DEACTIVATED';
export type SupportedRole = 'ADMIN' | 'PRODUCT_MANAGER';

export type StaffFixture = {
  userId: string;
  username: string;
  email: string;
  password: string;
  status: StaffStatus;
  roles: string[];
};

export class AuthAtddFixture {
  private readonly runId = randomUUID().replaceAll('-', '').slice(0, 12);
  private readonly userIds = new Set<string>();
  private readonly roleIds = new Map<string, string>();

  constructor(private readonly dataSource: DataSource) {}

  async initializeRoles(): Promise<void> {
    for (const roleName of ['ADMIN', 'PRODUCT_MANAGER', 'UNSUPPORTED_STAFF']) {
      const roleId = randomUUID();
      const rows = await this.dataSource.query(
        `INSERT INTO roles (role_id, role_name, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (role_name) DO UPDATE SET role_name = EXCLUDED.role_name
         RETURNING role_id`,
        [roleId, roleName, `ATDD ${roleName}`],
      );
      this.roleIds.set(roleName, rows[0].role_id);
    }
  }

  async createStaff(
    overrides: Partial<Omit<StaffFixture, 'userId' | 'username' | 'email'>> &
      Pick<Partial<StaffFixture>, 'username' | 'email'> = {},
  ): Promise<StaffFixture> {
    const suffix = `${this.runId}_${this.userIds.size}`;
    const fixture: StaffFixture = {
      userId: randomUUID(),
      username: overrides.username ?? `atdd_${suffix}`,
      email: overrides.email ?? `atdd_${suffix}@example.test`,
      password: overrides.password ?? DEFAULT_PASSWORD,
      status: overrides.status ?? 'ACTIVE',
      roles: overrides.roles ?? ['PRODUCT_MANAGER'],
    };
    const passwordHash = await hash(fixture.password, 10);

    await this.dataSource.query(
      `INSERT INTO users (user_id, username, email, password_hash, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        fixture.userId,
        fixture.username,
        fixture.email,
        passwordHash,
        fixture.status,
      ],
    );
    this.userIds.add(fixture.userId);

    for (const roleName of fixture.roles) {
      const roleId = this.roleIds.get(roleName);
      if (!roleId) throw new Error(`ATDD role not initialized: ${roleName}`);
      await this.dataSource.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [fixture.userId, roleId],
      );
    }
    return fixture;
  }

  async setStatus(userId: string, status: StaffStatus): Promise<void> {
    await this.dataSource.query(
      'UPDATE users SET status = $2 WHERE user_id = $1',
      [userId, status],
    );
  }

  async addRole(userId: string, role: SupportedRole): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, this.roleIds.get(role)],
    );
  }

  async removeRole(userId: string, role: SupportedRole): Promise<void> {
    await this.dataSource.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, this.roleIds.get(role)],
    );
  }

  async passwordHash(userId: string): Promise<string> {
    const rows = await this.dataSource.query(
      'SELECT password_hash FROM users WHERE user_id = $1',
      [userId],
    );
    return rows[0].password_hash;
  }

  async cleanup(): Promise<void> {
    const ids = [...this.userIds];
    if (ids.length === 0) return;
    await this.dataSource.query(
      'DELETE FROM users WHERE user_id = ANY($1::uuid[])',
      [ids],
    );
    this.userIds.clear();
  }
}
