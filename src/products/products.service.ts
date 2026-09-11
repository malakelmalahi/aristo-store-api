import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { Category } from '../categories/entities/category.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const category = await this.categoryRepository.findOne({
      where: { id: createProductDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(
        `Category with ID "${createProductDto.categoryId}" not found`,
      );
    }

    const slug = createProductDto.slug
      ? this.slugify(createProductDto.slug)
      : this.slugify(createProductDto.name);

    const existingSlug = await this.productRepository.findOne({
      where: { slug },
    });
    if (existingSlug) {
      throw new ConflictException(
        `Product with slug "${slug}" already exists. Please use a unique slug.`,
      );
    }

    const product = this.productRepository.create({
      ...createProductDto,
      slug,
    });

    return this.productRepository.save(product);
  }

  async findAll(query: ProductQueryDto, isAdmin = false) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      order = 'DESC',
    } = query;

    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      Number(maxPrice) < Number(minPrice)
    ) {
      throw new BadRequestException('maxPrice cannot be less than minPrice');
    }

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category');

    if (!isAdmin) {
      queryBuilder.andWhere('product.isActive = :isActive', { isActive: true });
    }

    if (categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(LOWER(product.name) LIKE :search OR LOWER(product.description) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    if (minPrice !== undefined) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    const validSortFields = ['price', 'createdAt', 'name'];
    const sortField = validSortFields.includes(sortBy)
      ? `product.${sortBy}`
      : 'product.createdAt';
    const sortDirection =
      order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    queryBuilder.orderBy(sortField, sortDirection);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      data: items,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, includeInactive = false): Promise<Product> {
    const where: any = { id };
    if (!includeInactive) {
      where.isActive = true;
    }

    const product = await this.productRepository.findOne({
      where,
      relations: { category: true },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { slug, isActive: true },
      relations: { category: true },
    });
    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }
    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id, true);

    if (updateProductDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateProductDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with ID "${updateProductDto.categoryId}" not found`,
        );
      }
      product.categoryId = updateProductDto.categoryId;
    }

    if (updateProductDto.slug && updateProductDto.slug !== product.slug) {
      const formattedSlug = this.slugify(updateProductDto.slug);
      const existing = await this.productRepository.findOne({
        where: { slug: formattedSlug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Product with slug "${formattedSlug}" already exists`);
      }
      product.slug = formattedSlug;
    }

    Object.assign(product, {
      ...updateProductDto,
      slug: product.slug, // keep existing or sanitized slug
    });

    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<{ message: string; product: Product }> {
    const product = await this.findOne(id, true);
    product.isActive = false;
    await this.productRepository.save(product);
    return {
      message: 'Product deactivated successfully',
      product,
    };
  }
}
