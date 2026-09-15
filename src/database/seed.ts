import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Address } from '../addresses/entities/address.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { UserRole } from '../common/enums/user-role.enum';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || process.env.RENDER_DATABASE_URL;

const AppDataSource = new DataSource({
  type: 'postgres',
  ...(databaseUrl
    ? { url: databaseUrl }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'aristo_store_db',
      }),
  entities: [
    User,
    Category,
    Product,
    Cart,
    CartItem,
    Address,
    Order,
    OrderItem,
  ],
  synchronize: true,
});

async function seed() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();
  console.log('Database connected successfully.');

  const userRepository = AppDataSource.getRepository(User);
  const categoryRepository = AppDataSource.getRepository(Category);
  const productRepository = AppDataSource.getRepository(Product);

  const hashedPassword = await bcrypt.hash('AdminPassword123!', 10);
  const customerHashedPassword = await bcrypt.hash('CustomerPassword123!', 10);

  // 1. Seed Admin
  let admin = await userRepository.findOne({ where: { email: 'admin@aristo.com' } });
  if (!admin) {
    admin = userRepository.create({
      name: 'System Admin',
      email: 'admin@aristo.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
    });
    await userRepository.save(admin);
    console.log('Admin user created: admin@aristo.com / AdminPassword123!');
  } else {
    console.log('Admin user already exists.');
  }

  // 2. Seed Customer
  let customer = await userRepository.findOne({ where: { email: 'malak@example.com' } });
  if (!customer) {
    customer = userRepository.create({
      name: 'malak elmalahi',
      email: 'malak@example.com',
      password: customerHashedPassword,
      role: UserRole.CUSTOMER,
    });
    await userRepository.save(customer);
    console.log('Customer user created: malak@example.com / CustomerPassword123!');
  } else {
    console.log('Customer user already exists.');
  }

  // 3. Seed Categories
  const categoryNames = ['Skincare', 'Fragrances', 'Haircare', 'Makeup'];
  const categories: Record<string, Category> = {};

  for (const name of categoryNames) {
    let cat = await categoryRepository.findOne({ where: { name } });
    if (!cat) {
      cat = categoryRepository.create({
        name,
        description: `High-quality ${name.toLowerCase()} products`,
        imageUrl: `https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500`,
      });
      cat = await categoryRepository.save(cat);
      console.log(`Category created: ${name}`);
    }
    categories[name] = cat;
  }

  // 4. Seed Products
  const sampleProducts = [
    {
      name: 'Vitamin C Brightening Serum',
      slug: 'vitamin-c-brightening-serum',
      description: 'Brightening facial serum with 15% pure Vitamin C and Hyaluronic acid.',
      price: 24.99,
      stock: 50,
      imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500',
      isActive: true,
      category: categories['Skincare'],
    },
    {
      name: 'Hydrating Rose Water Toner',
      slug: 'hydrating-rose-water-toner',
      description: 'Refreshing facial toner made from organic Damask rose petals.',
      price: 15.5,
      stock: 40,
      imageUrl: 'https://images.unsplash.com/photo-1608248597358-1e4284d72023?w=500',
      isActive: true,
      category: categories['Skincare'],
    },
    {
      name: 'Oud Royal Eau De Parfum',
      slug: 'oud-royal-eau-de-parfum',
      description: 'Luxury Arabian Oud perfume with woody amber notes and long-lasting scent.',
      price: 85.0,
      stock: 25,
      imageUrl: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=500',
      isActive: true,
      category: categories['Fragrances'],
    },
    {
      name: 'Nourishing Argan Oil Shampoo',
      slug: 'nourishing-argan-oil-shampoo',
      description: 'Sulfate-free nourishing shampoo infused with pure Moroccan Argan Oil.',
      price: 18.0,
      stock: 35,
      imageUrl: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500',
      isActive: true,
      category: categories['Haircare'],
    },
  ];

  for (const prodData of sampleProducts) {
    const existing = await productRepository.findOne({ where: { slug: prodData.slug } });
    if (!existing && prodData.category) {
      const prod = productRepository.create({
        name: prodData.name,
        slug: prodData.slug,
        description: prodData.description,
        price: prodData.price,
        stock: prodData.stock,
        imageUrl: prodData.imageUrl,
        isActive: prodData.isActive,
        categoryId: prodData.category.id,
      });
      await productRepository.save(prod);
      console.log(`Product created: ${prod.name}`);
    }
  }

  console.log('Seeding completed successfully!');
  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
