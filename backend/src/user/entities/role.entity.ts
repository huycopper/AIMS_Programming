import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryColumn('uuid', { name: 'role_id' })
  roleId: string;

  @Column('varchar', { name: 'role_name', length: 100, unique: true })
  roleName: string;

  @Column('text', { name: 'description', nullable: true })
  description: string;
}
