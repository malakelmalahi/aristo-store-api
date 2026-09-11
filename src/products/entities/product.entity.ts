import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Category } from '../../categories/entities/category.entity';

@Entity('products')
export class Product {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Vitamin C Serum' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: 'vitamin-c-serum' })
  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @ApiPropertyOptional({ example: 'Face serum for daily glow' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ example: 18.5 })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  price: number;

  @ApiProperty({ example: 20 })
  @Column({ type: 'int', default: 0 })
  stock: number;

  @ApiPropertyOptional({ example: 'https://example.com/serum.jpg' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl?: string;

  @ApiProperty({ example: true, default: true })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
