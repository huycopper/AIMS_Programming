import { Entity, PrimaryColumn } from 'typeorm';

@Entity('user_roles')
export class UserRole {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  @PrimaryColumn('uuid', { name: 'role_id' })
  roleId: string;
}
