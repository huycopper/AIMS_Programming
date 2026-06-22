import { Entity, PrimaryColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { Role } from './role.entity.js';

export type UserStatus = 'ACTIVE' | 'DEACTIVATED' | 'BLOCKED';

@Entity('users')
export class User {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  @Column('varchar', { name: 'username', length: 100, unique: true })
  username: string;

  @Column('varchar', { name: 'email', length: 255, unique: true })
  email: string;

  @Column('text', { name: 'password_hash', select: false })
  passwordHash: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['ACTIVE', 'DEACTIVATED', 'BLOCKED'],
    default: 'ACTIVE',
  })
  status: UserStatus;

  @ManyToMany(() => Role)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'userId' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'roleId' },
  })
  roles: Role[];
}
