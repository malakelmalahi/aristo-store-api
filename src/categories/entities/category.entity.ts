import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Product } from '../../products/entities/product.entity';

@Entity('categories')
export class Category {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Skincare' })
  @Column({ type: 'varchar', length: 150, unique: true })
  name: string;

  @ApiPropertyOptional({ example: 'Products for skin care' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/skincare.jpg' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl?: string;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
