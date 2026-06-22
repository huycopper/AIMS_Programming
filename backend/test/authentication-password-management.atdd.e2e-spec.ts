import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { decode } from 'jsonwebtoken';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import {
  AuthAtddFixture,
  DEFAULT_PASSWORD,
  JWT_TEST_SECRET,
  PASSWORD_72_ASCII_BYTES,
  PASSWORD_72_MULTIBYTE_BYTES,
  PASSWORD_73_ASCII_BYTES,
  PASSWORD_73_MULTIBYTE_BYTES,
  StaffFixture,
} from './support/auth-atdd-fixture';
import { assertDedicatedTestDatabase } from './support/test-database.guard';

type LoginBody = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: {
    userId: string;
    username: string;
    email: string;
    roles: string[];
  };
};

const invalidCredentials = {
  statusCode: 401,
  code: 'INVALID_CREDENTIALS',
  message: 'Invalid credentials.',
};

describe('Story 5.3 staff authentication and password management (ATDD e2e)', () => {
  jest.setTimeout(30000);
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let fixtures: AuthAtddFixture;
  let admin: StaffFixture;
  let manager: StaffFixture;
  let dualRole: StaffFixture;

  const login = (identifier: string, password = DEFAULT_PASSWORD) =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier, password });

  const tokenFor = async (staff: StaffFixture): Promise<string> => {
    const response = await login(staff.username, staff.password).expect(200);
    return (response.body as LoginBody).accessToken;
  };

  beforeAll(async () => {
    assertDedicatedTestDatabase();
    process.env.JWT_SECRET = JWT_TEST_SECRET;
    process.env.JWT_EXPIRES_IN = '1h';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    fixtures = new AuthAtddFixture(dataSource);
    await fixtures.initializeRoles();
    admin = await fixtures.createStaff({ roles: ['ADMIN'] });
    manager = await fixtures.createStaff({ roles: ['PRODUCT_MANAGER'] });
    dualRole = await fixtures.createStaff({
      roles: ['ADMIN', 'PRODUCT_MANAGER'],
    });
  });

  afterAll(async () => {
    if (fixtures) await fixtures.cleanup();
    if (app) await app.close();
  });

  describe('[P0] exact identifier login and generic denial', () => {
    it.each(['username', 'email'] as const)(
      'logs in by exact %s',
      async (field) => {
        const response = await login(manager[field]).expect(200);
        expect(response.body).toMatchObject({
          tokenType: 'Bearer',
          expiresIn: expect.any(Number),
          user: {
            userId: manager.userId,
            username: manager.username,
            email: manager.email,
            roles: ['PRODUCT_MANAGER'],
          },
        });
        expect(response.body.accessToken).toEqual(expect.any(String));
        expect(JSON.stringify(response.body)).not.toContain(manager.password);
        expect(JSON.stringify(response.body)).not.toContain('passwordHash');
        expect(JSON.stringify(response.body)).not.toContain('password_hash');
      },
    );

    it.each([
      [
        'username case variant',
        () => manager.username.toUpperCase(),
        () => DEFAULT_PASSWORD,
      ],
      [
        'email case variant',
        () => manager.email.toUpperCase(),
        () => DEFAULT_PASSWORD,
      ],
      [
        'unknown identifier',
        () => 'missing-staff@example.test',
        () => DEFAULT_PASSWORD,
      ],
      ['wrong password', () => manager.username, () => 'WrongPassword1'],
    ])('returns the same 401 for %s', async (_name, identifier, password) => {
      const response = await login(identifier(), password()).expect(401);
      expect(response.body).toEqual(invalidCredentials);
      expect(response.body.accessToken).toBeUndefined();
    });

    it.each(['BLOCKED', 'DEACTIVATED'] as const)(
      'returns generic 401 for a %s account',
      async (status) => {
        const staff = await fixtures.createStaff({ status });
        const response = await login(staff.username).expect(401);
        expect(response.body).toEqual(invalidCredentials);
      },
    );

    it('returns generic 401 for an account without a supported role', async () => {
      const noRole = await fixtures.createStaff({ roles: [] });
      const unsupported = await fixtures.createStaff({
        roles: ['UNSUPPORTED_STAFF'],
      });
      for (const staff of [noRole, unsupported]) {
        const response = await login(staff.username).expect(401);
        expect(response.body).toEqual(invalidCredentials);
      }
    });
  });

  describe('[P0] bcrypt byte boundary', () => {
    it.each([
      ['ASCII', PASSWORD_72_ASCII_BYTES],
      ['multibyte', PASSWORD_72_MULTIBYTE_BYTES],
    ])(
      'accepts a valid password of exactly 72 UTF-8 bytes (%s)',
      async (_name, password) => {
        expect(Buffer.byteLength(password, 'utf8')).toBe(72);
        const staff = await fixtures.createStaff({ password });
        await login(staff.username, password).expect(200);
      },
    );

    it.each([
      ['ASCII', PASSWORD_72_ASCII_BYTES, PASSWORD_73_ASCII_BYTES],
      ['multibyte', PASSWORD_72_MULTIBYTE_BYTES, PASSWORD_73_MULTIBYTE_BYTES],
    ])(
      'rejects a 73-byte %s password sharing the stored bcrypt prefix',
      async (_name, storedPassword, attemptedPassword) => {
        expect(Buffer.byteLength(attemptedPassword, 'utf8')).toBe(73);
        const staff = await fixtures.createStaff({ password: storedPassword });
        const response = await login(staff.username, attemptedPassword).expect(
          401,
        );
        expect(response.body).toEqual(invalidCredentials);
      },
    );
  });

  describe('[P0] JWT integrity and authoritative current state', () => {
    it('issues an HS256 token with only approved payload claims and a bounded expiry', async () => {
      const response = await login(dualRole.username).expect(200);
      const token = response.body.accessToken as string;
      const jwt = decode(token, { complete: true }) as {
        header: Record<string, unknown>;
        payload: Record<string, unknown>;
      };
      expect(jwt.header.alg).toBe('HS256');
      expect(Object.keys(jwt.payload).sort()).toEqual([
        'exp',
        'iat',
        'roles',
        'sub',
      ]);
      expect(jwt.payload).toMatchObject({
        sub: dualRole.userId,
        roles: expect.arrayContaining(['ADMIN', 'PRODUCT_MANAGER']),
        iat: expect.any(Number),
        exp: expect.any(Number),
      });
      expect((jwt.payload.exp as number) - (jwt.payload.iat as number)).toBe(
        3600,
      );
    });

    it.each([
      ['missing', () => undefined],
      ['malformed', () => 'not-a-jwt'],
      [
        'wrong signature',
        () =>
          new JwtService({
            secret: 'different-atdd-secret-with-32-bytes!',
          }).sign(
            { sub: admin.userId, roles: ['ADMIN'] },
            { algorithm: 'HS256', expiresIn: '1h' },
          ),
      ],
      [
        'expired',
        () =>
          new JwtService({ secret: JWT_TEST_SECRET }).sign(
            { sub: admin.userId, roles: ['ADMIN'] },
            { algorithm: 'HS256', expiresIn: -1 },
          ),
      ],
    ])('returns 401 for a %s token', async (_case, tokenFn) => {
      const token = tokenFn();
      const call = request(app.getHttpServer()).get('/api/auth/me');
      if (token) call.set('Authorization', `Bearer ${token}`);
      const response = await call.expect(401);
      expect(response.body).toEqual({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required.',
      });
    });

    it.each(['BLOCKED', 'DEACTIVATED'] as const)(
      'rejects an already-issued token after status becomes %s',
      async (status) => {
        const staff = await fixtures.createStaff({
          roles: ['PRODUCT_MANAGER'],
        });
        const token = await tokenFor(staff);
        await fixtures.setStatus(staff.userId, status);
        await request(app.getHttpServer())
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      },
    );

    it('removes authorization immediately when a signed role is removed in the database', async () => {
      const staff = await fixtures.createStaff({ roles: ['PRODUCT_MANAGER'] });
      const token = await tokenFor(staff);
      await fixtures.removeRole(staff.userId, 'PRODUCT_MANAGER');
      await request(app.getHttpServer())
        .get('/api/products/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('does not grant a newly assigned database role until a new token is issued', async () => {
      const staff = await fixtures.createStaff({ roles: ['ADMIN'] });
      const oldToken = await tokenFor(staff);
      await fixtures.addRole(staff.userId, 'PRODUCT_MANAGER');
      await request(app.getHttpServer())
        .get('/api/products/admin')
        .set('Authorization', `Bearer ${oldToken}`)
        .expect(403);
      const newToken = await tokenFor(staff);
      await request(app.getHttpServer())
        .get('/api/products/admin')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);
    });
  });

  describe('[P0] authorization and product-route boundary', () => {
    it('uses 403 only for an active authenticated principal lacking the required role', async () => {
      const adminToken = await tokenFor(admin);
      const response = await request(app.getHttpServer())
        .get('/api/products/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
      expect(response.body).toEqual({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      });
    });

    it.each(['manager', 'dualRole'] as const)(
      'allows PRODUCT_MANAGER capability for %s',
      async (kind) => {
        const staff = kind === 'manager' ? manager : dualRole;
        const token = await tokenFor(staff);
        await request(app.getHttpServer())
          .get('/api/products/admin')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
      },
    );

    it('restores every role for a dual-role principal through /api/auth/me', async () => {
      const token = await tokenFor(dualRole);
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.roles.sort()).toEqual(['ADMIN', 'PRODUCT_MANAGER']);
    });

    it.each([
      ['get', '/api/products/admin', undefined],
      ['get', `/api/products/${randomProductId()}/histories`, undefined],
      ['post', '/api/products', {}],
      ['patch', `/api/products/${randomProductId()}`, {}],
      [
        'post',
        '/api/products/bulk-delete',
        { productIds: [randomProductId()] },
      ],
    ] as const)(
      'protects %s %s even when X-AIMS-User-Id is supplied',
      async (method, url, body) => {
        let call = request(app.getHttpServer())
          [method](url)
          .set('X-AIMS-User-Id', manager.userId);
        if (body) call = call.send(body);
        await call.expect(401);
      },
    );

    it('cannot elevate an ADMIN token with a PRODUCT_MANAGER X-AIMS-User-Id header', async () => {
      const token = await tokenFor(admin);
      await request(app.getHttpServer())
        .get('/api/products/admin')
        .set('Authorization', `Bearer ${token}`)
        .set('X-AIMS-User-Id', manager.userId)
        .expect(403);
    });

    it.each(['/api/products', '/api/products/random'])(
      'keeps customer catalog route %s public',
      async (url) => {
        await request(app.getHttpServer()).get(url).expect(200);
      },
    );
  });

  describe('[P0] password change atomicity and non-mutation', () => {
    it('atomically rotates the hash, rejects the old password, and accepts the new password', async () => {
      const staff = await fixtures.createStaff();
      const token = await tokenFor(staff);
      const before = await fixtures.passwordHash(staff.userId);
      const newPassword = 'NewValidPassword2';

      await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: staff.password, newPassword })
        .expect(204);

      const after = await fixtures.passwordHash(staff.userId);
      expect(after).not.toBe(before);
      expect(after).not.toBe(newPassword);
      await login(staff.username, staff.password).expect(401);
      await login(staff.username, newPassword).expect(200);
    });

    it.each([
      [
        'wrong current password',
        'WrongPassword1',
        'NewValidPassword2',
        400,
        'CURRENT_PASSWORD_INVALID',
      ],
      [
        'unchanged password',
        DEFAULT_PASSWORD,
        DEFAULT_PASSWORD,
        400,
        'PASSWORD_POLICY_VIOLATION',
      ],
      [
        'too short',
        DEFAULT_PASSWORD,
        'Aa1aaaa',
        400,
        'PASSWORD_POLICY_VIOLATION',
      ],
      [
        'missing uppercase',
        DEFAULT_PASSWORD,
        'lowercase1',
        400,
        'PASSWORD_POLICY_VIOLATION',
      ],
      [
        'missing lowercase',
        DEFAULT_PASSWORD,
        'UPPERCASE1',
        400,
        'PASSWORD_POLICY_VIOLATION',
      ],
      [
        'missing digit',
        DEFAULT_PASSWORD,
        'NoDigitsHere',
        400,
        'PASSWORD_POLICY_VIOLATION',
      ],
      [
        'leading whitespace',
        DEFAULT_PASSWORD,
        ' ValidPassword1',
        400,
        'PASSWORD_POLICY_VIOLATION',
      ],
      [
        'trailing whitespace',
        DEFAULT_PASSWORD,
        'ValidPassword1 ',
        400,
        'PASSWORD_POLICY_VIOLATION',
      ],
      [
        'over 72 UTF-8 bytes',
        DEFAULT_PASSWORD,
        PASSWORD_73_MULTIBYTE_BYTES,
        400,
        'PASSWORD_POLICY_VIOLATION',
      ],
    ])(
      'does not mutate the hash for %s',
      async (_case, currentPassword, newPassword, status, code) => {
        const staff = await fixtures.createStaff();
        const token = await tokenFor(staff);
        const before = await fixtures.passwordHash(staff.userId);
        const response = await request(app.getHttpServer())
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${token}`)
          .send({ currentPassword, newPassword })
          .expect(status);
        expect(response.body.code).toBe(code);
        expect(JSON.stringify(response.body)).not.toContain(currentPassword);
        expect(JSON.stringify(response.body)).not.toContain(newPassword);
        expect(await fixtures.passwordHash(staff.userId)).toBe(before);
      },
    );

    it('allows exactly one of two concurrent compare-and-swap changes and never overwrites the winner', async () => {
      const staff = await fixtures.createStaff();
      const token = await tokenFor(staff);
      const first = 'ConcurrentWinner1';
      const second = 'ConcurrentWinner2';
      const responses = await Promise.all([
        request(app.getHttpServer())
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${token}`)
          .send({ currentPassword: staff.password, newPassword: first }),
        request(app.getHttpServer())
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${token}`)
          .send({ currentPassword: staff.password, newPassword: second }),
      ]);
      expect(responses.map((response) => response.status).sort()).toEqual([
        204, 400,
      ]);
      const successfulLogins = await Promise.all([
        login(staff.username, first),
        login(staff.username, second),
      ]);
      expect(
        successfulLogins.filter((response) => response.status === 200),
      ).toHaveLength(1);
      expect(
        successfulLogins.filter((response) => response.status === 401),
      ).toHaveLength(1);
    });

    it.each(['BLOCKED', 'DEACTIVATED'] as const)(
      'returns 401 and preserves the hash if status changes to %s before password change',
      async (status) => {
        const staff = await fixtures.createStaff();
        const token = await tokenFor(staff);
        const before = await fixtures.passwordHash(staff.userId);
        await fixtures.setStatus(staff.userId, status);
        await request(app.getHttpServer())
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${token}`)
          .send({
            currentPassword: staff.password,
            newPassword: 'NewValidPassword2',
          })
          .expect(401);
        expect(await fixtures.passwordHash(staff.userId)).toBe(before);
      },
    );
  });
});

function randomProductId(): string {
  return '99999999-9999-4999-8999-999999999999';
}
