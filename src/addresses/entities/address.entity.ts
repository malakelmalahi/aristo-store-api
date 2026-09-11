import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('addresses')
export class Address {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ example: 'Malak Elmalahi' })
  @Column({ type: 'varchar', length: 150 })
  fullName: string;

  @ApiProperty({ example: '0590000000' })
  @Column({ type: 'varchar', length: 50 })
  phone: string;

  @ApiProperty({ example: 'Hebron' })
  @Column({ type: 'varchar', length: 100 })
  city: string;

  @ApiProperty({ example: 'Al Ain Street' })
  @Column({ type: 'varchar', length: 255 })
  street: string;

  @ApiPropertyOptional({ example: '12' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  building?: string;

  @ApiPropertyOptional({ example: 'Second floor' })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ example: false, default: false })
  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @OneToMany(() => Order, (order) => order.address)
  orders: Order[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
