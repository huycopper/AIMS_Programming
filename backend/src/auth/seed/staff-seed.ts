import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { compare, hash } from 'bcrypt';
import { User } from '../../user/entities/user.entity.js';
import { Role } from '../../user/entities/role.entity.js';
import { UserRole } from '../../user/entities/user-role.entity.js';

export type StaffSeedConfig = {
  admin: { username: string; email: string; password: string };
  productManager: { username: string; email: string; password: string };
  bcryptRounds: number;
};

export function readStaffSeedConfig(
  env: NodeJS.ProcessEnv,
): StaffSeedConfig | null {
  const adminUsername = env.SEED_ADMIN_USERNAME || env.STAFF_ADMIN_USERNAME;
  const adminEmail = env.SEED_ADMIN_EMAIL || env.STAFF_ADMIN_EMAIL;
  const adminPassword = env.SEED_ADMIN_PASSWORD || env.STAFF_ADMIN_PASSWORD;
  const pmUsername =
    env.SEED_PRODUCT_MANAGER_USERNAME || env.STAFF_PRODUCT_MANAGER_USERNAME;
  const pmEmail =
    env.SEED_PRODUCT_MANAGER_EMAIL || env.STAFF_PRODUCT_MANAGER_EMAIL;
  const pmPassword =
    env.SEED_PRODUCT_MANAGER_PASSWORD || env.STAFF_PRODUCT_MANAGER_PASSWORD;

  const seedSet = [
    env.SEED_ADMIN_USERNAME,
    env.SEED_ADMIN_EMAIL,
    env.SEED_ADMIN_PASSWORD,
    env.SEED_PRODUCT_MANAGER_USERNAME,
    env.SEED_PRODUCT_MANAGER_EMAIL,
    env.SEED_PRODUCT_MANAGER_PASSWORD,
  ];
  const staffSet = [
    env.STAFF_ADMIN_USERNAME,
    env.STAFF_ADMIN_EMAIL,
    env.STAFF_ADMIN_PASSWORD,
    env.STAFF_PRODUCT_MANAGER_USERNAME,
    env.STAFF_PRODUCT_MANAGER_EMAIL,
    env.STAFF_PRODUCT_MANAGER_PASSWORD,
  ];

  const seedPresentCount = seedSet.filter(
    (v) => v !== undefined && v !== '',
  ).length;
  const staffPresentCount = staffSet.filter(
    (v) => v !== undefined && v !== '',
  ).length;

  if (seedPresentCount === 0 && staffPresentCount === 0) {
    return null;
  }

  if (
    (seedPresentCount > 0 && seedPresentCount < 6) ||
    (staffPresentCount > 0 && staffPresentCount < 6)
  ) {
    throw new Error(
      'Incomplete configuration: all six staff configuration variables are required.',
    );
  }

  const rounds = env.BCRYPT_SALT_ROUNDS
    ? parseInt(env.BCRYPT_SALT_ROUNDS, 10)
    : 12;

  return {
    admin: {
      username: adminUsername!,
      email: adminEmail!,
      password: adminPassword!,
    },
    productManager: {
      username: pmUsername!,
      email: pmEmail!,
      password: pmPassword!,
    },
    bcryptRounds: rounds,
  };
}

export async function seedStaffAccounts(
  dataSource: DataSource,
  config: StaffSeedConfig,
): Promise<void> {
  if (
    config.admin.username === config.productManager.username ||
    config.admin.email === config.productManager.email
  ) {
    throw new Error(
      'Duplicate configured username or email between admin and product manager.',
    );
  }

  await dataSource.transaction(async (manager) => {
    // 1. Upsert Roles
    let adminRole = await manager
      .getRepository(Role)
      .findOneBy({ roleName: 'ADMIN' });
    if (!adminRole) {
      adminRole = manager.getRepository(Role).create({
        roleId: randomUUID(),
        roleName: 'ADMIN',
        description: 'Administrator Role',
      });
      await manager.getRepository(Role).save(adminRole);
    }

    let pmRole = await manager
      .getRepository(Role)
      .findOneBy({ roleName: 'PRODUCT_MANAGER' });
    if (!pmRole) {
      pmRole = manager.getRepository(Role).create({
        roleId: randomUUID(),
        roleName: 'PRODUCT_MANAGER',
        description: 'Product Manager Role',
      });
      await manager.getRepository(Role).save(pmRole);
    }

    // 2. Process Admin and PM users
    const processUser = async (
      username: string,
      email: string,
      plaintextPassword: string,
      role: Role,
    ) => {
      const userByUsername = await manager
        .getRepository(User)
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.roles', 'r')
        .addSelect('user.passwordHash')
        .where('user.username = :username', { username })
        .getOne();

      const userByEmail = await manager
        .getRepository(User)
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.roles', 'r')
        .addSelect('user.passwordHash')
        .where('user.email = :email', { email })
        .getOne();

      if (userByUsername || userByEmail) {
        if (
          userByUsername &&
          userByEmail &&
          userByUsername.userId !== userByEmail.userId
        ) {
          throw new Error(
            'Conflict: username and email belong to different users.',
          );
        }
        const existingUser = (userByUsername || userByEmail)!;
        if (
          existingUser.username !== username ||
          existingUser.email !== email
        ) {
          throw new Error(
            'Conflict: username or email mismatch for existing user.',
          );
        }

        if (existingUser.status !== 'ACTIVE') {
          throw new Error(
            'Verification failed: existing staff account is not ACTIVE.',
          );
        }

        const pwMatches = await compare(
          plaintextPassword,
          existingUser.passwordHash,
        );
        if (!pwMatches) {
          throw new Error(
            'Verification failed: password mismatch for existing user.',
          );
        }

        const hasRole = existingUser.roles.some(
          (r) => r.roleId === role.roleId,
        );
        if (!hasRole) {
          await manager.getRepository(UserRole).save({
            userId: existingUser.userId,
            roleId: role.roleId,
          });
        }
      } else {
        const userId = randomUUID();
        const pwHash = await hash(plaintextPassword, config.bcryptRounds);
        const newUser = manager.getRepository(User).create({
          userId,
          username,
          email,
          passwordHash: pwHash,
          status: 'ACTIVE',
        });
        await manager.getRepository(User).save(newUser);

        await manager.getRepository(UserRole).save({
          userId,
          roleId: role.roleId,
        });
      }
    };

    await processUser(
      config.admin.username,
      config.admin.email,
      config.admin.password,
      adminRole,
    );
    await processUser(
      config.productManager.username,
      config.productManager.email,
      config.productManager.password,
      pmRole,
    );
  });
}
