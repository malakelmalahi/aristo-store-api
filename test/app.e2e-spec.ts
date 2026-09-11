import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { User } from './../src/users/entities/user.entity';
import { UserRole } from './../src/common/enums/user-role.enum';
import { Cart } from './../src/cart/entities/cart.entity';
import { CartItem } from './../src/cart/entities/cart-item.entity';
import { Address } from './../src/addresses/entities/address.entity';
import { Product } from './../src/products/entities/product.entity';
import { Category } from './../src/categories/entities/category.entity';
import { Order } from './../src/orders/entities/order.entity';
import { OrderItem } from './../src/orders/entities/order-item.entity';

describe('E-Commerce API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let customerToken: string;
  let adminId: string;
  let customerId: string;
  let categoryId: string;
  let productId: string;
  let addressId: string;
  let orderId: string;

  const runId = Date.now();
  const adminEmail = `e2e-admin-${runId}@example.com`;
  const customerEmail = `e2e-customer-${runId}@example.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    await app.init();

    dataSource = app.get(DataSource);

    const admin = await dataSource.getRepository(User).save({
      name: 'E2E Admin',
      email: adminEmail,
      password: await bcrypt.hash('AdminPassword123!', 10),
      role: UserRole.ADMIN,
    });
    adminId = admin.id;
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      // Remove only records created by this suite, in foreign-key-safe order.
      if (orderId) await dataSource.getRepository(OrderItem).delete({ orderId });
      if (orderId) await dataSource.getRepository(Order).delete({ id: orderId });
      if (customerId) {
        const cart = await dataSource.getRepository(Cart).findOne({
          where: { userId: customerId },
        });
        if (cart) await dataSource.getRepository(CartItem).delete({ cartId: cart.id });
        if (cart) await dataSource.getRepository(Cart).delete({ id: cart.id });
        await dataSource.getRepository(Address).delete({ userId: customerId });
      }
      if (productId) await dataSource.getRepository(Product).delete({ id: productId });
      if (categoryId) await dataSource.getRepository(Category).delete({ id: categoryId });
      if (customerId) await dataSource.getRepository(User).delete({ id: customerId });
      if (adminId) await dataSource.getRepository(User).delete({ id: adminId });
    }
    await app?.close();
  });

  it('completes the admin-to-customer checkout flow', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: 'AdminPassword123!' })
      .expect(200);
    expect(adminLogin.body.user.role).toBe(UserRole.ADMIN);
    adminToken = adminLogin.body.accessToken;

    const createdCategory = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `E2E Category ${runId}`, description: 'Created by e2e test' })
      .expect(201);
    categoryId = createdCategory.body.id;

    const createdProduct = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `E2E Product ${runId}`,
        slug: `e2e-product-${runId}`,
        description: 'Created for a complete checkout test',
        price: 25,
        stock: 5,
        categoryId,
      })
      .expect(201);
    productId = createdProduct.body.id;

    const registeredCustomer = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'E2E Customer',
        email: customerEmail,
        password: 'CustomerPassword123!',
      })
      .expect(201);
    customerId = registeredCustomer.body.user.id;
    customerToken = registeredCustomer.body.accessToken;
    expect(registeredCustomer.body.user.role).toBe(UserRole.CUSTOMER);

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId, quantity: 2 })
      .expect(201);

    const createdAddress = await request(app.getHttpServer())
      .post('/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        fullName: 'E2E Customer',
        phone: '0590000000',
        city: 'Hebron',
        street: 'Test Street',
        building: '1',
        isDefault: true,
      })
      .expect(201);
    addressId = createdAddress.body.id;

    const checkout = await request(app.getHttpServer())
      .post('/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ addressId, paymentMethod: 'cash_on_delivery' })
      .expect(201);
    orderId = checkout.body.id;
    expect(checkout.body.status).toBe('pending');
    expect(checkout.body.items).toHaveLength(1);
    expect(checkout.body.total).toBe(60);

    const cartAfterCheckout = await request(app.getHttpServer())
      .get('/cart')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(cartAfterCheckout.body.items).toHaveLength(0);

    const productAfterCheckout = await request(app.getHttpServer())
      .get(`/products/${productId}`)
      .expect(200);
    expect(productAfterCheckout.body.stock).toBe(3);

    const ordersForAdmin = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(ordersForAdmin.body.data.some((order: Order) => order.id === orderId)).toBe(true);

    await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'processing' })
      .expect(200);

    const customerOrder = await request(app.getHttpServer())
      .get(`/orders/my-orders/${orderId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(customerOrder.body.status).toBe('processing');
  });
});
