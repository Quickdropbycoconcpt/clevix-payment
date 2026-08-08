import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  userId: string;

  @Column({ type: 'varchar' })
  firstName: string;

  @Column({ type: 'varchar' })
  lastName: string;

  @Column({ type: 'uuid', nullable: true })
  activeBusinessId: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'varchar' })
  phoneNumber: string;

  @Column({ type: 'varchar' })
  dialCode: string;

  @Column({ type: 'varchar' })
  password: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleteAt: Date;
}
