import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Address } from '../addresses/entities/address.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { CheckoutDto } from './dto/checkout.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentMethod } from '../common/enums/payment-method.enum';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async checkout(userId: string, checkoutDto: CheckoutDto): Promise<Order> {
    const { addressId, paymentMethod = PaymentMethod.CASH_ON_DELIVERY } = checkoutDto;

    // 1. Fetch user address and verify ownership
    const address = await this.addressRepository.findOne({
      where: { id: addressId, userId },
    });
    if (!address) {
      throw new NotFoundException(
        `Address with ID "${addressId}" not found or does not belong to you`,
      );
    }

    // 2. Fetch cart and cart items
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: { items: { product: true } },
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException('Your shopping cart is empty');
    }

    // 3. Database Transaction
    return this.dataSource.transaction(async (manager) => {
      let subtotal = 0;
      const orderItemsToCreate: Partial<OrderItem>[] = [];

      for (const item of cart.items) {
        // Query product with pessimistic write lock to prevent race conditions on stock
        const product = await manager.findOne(Product, {
          where: { id: item.productId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID "${item.productId}" no longer exists`);
        }

        if (!product.isActive) {
          throw new BadRequestException(
            `Product "${product.name}" is currently unavailable/inactive`,
          );
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}". Available: ${product.stock}, in cart: ${item.quantity}`,
          );
        }

        const price = Number(product.price);
        const itemSubtotal = Number((price * item.quantity).toFixed(2));
        subtotal += itemSubtotal;

        // Deduct stock
        product.stock -= item.quantity;
        await manager.save(Product, product);

        // Prepare OrderItem snapshot
        orderItemsToCreate.push({
          productId: product.id,
          productName: product.name,
          productPrice: price,
          quantity: item.quantity,
          subtotal: itemSubtotal,
        });
      }

      subtotal = Number(subtotal.toFixed(2));
      const shippingFee = Number(
        this.configService.get<number>('SHIPPING_FEE', 10),
      );
      const total = Number((subtotal + shippingFee).toFixed(2));

      // Create Order
      const newOrder = manager.create(Order, {
        userId,
        addressId,
        status: OrderStatus.PENDING,
        paymentMethod,
        subtotal,
        shippingFee,
        total,
      });

      const savedOrder = await manager.save(Order, newOrder);

      // Create OrderItems linked to savedOrder
      for (const itemData of orderItemsToCreate) {
        const orderItem = manager.create(OrderItem, {
          ...itemData,
          orderId: savedOrder.id,
        });
        await manager.save(OrderItem, orderItem);
      }

      // Clear the cart items
      await manager.delete(CartItem, { cartId: cart.id });

      // Fetch completed order with relations
      return manager.findOne(Order, {
        where: { id: savedOrder.id },
        relations: { items: true, address: true },
      }) as Promise<Order>;
    });
  }

  async findUserOrders(userId: string, paginationQuery?: PaginationQueryDto) {
    const page = paginationQuery?.page || 1;
    const limit = paginationQuery?.limit || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await this.orderRepository.findAndCount({
      where: { userId },
      relations: { items: true, address: true },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: orders,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findUserOrderById(userId: string, orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
      relations: { items: true, address: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    return order;
  }

  async findAllOrders(query: OrderQueryDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.address', 'address')
      .leftJoinAndSelect('order.items', 'items')
      .orderBy('order.createdAt', 'DESC');

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    queryBuilder.skip(skip).take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return {
      data: orders,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOrderById(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { user: true, address: true, items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    return order;
  }

  async updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<Order> {
    const order = await this.findOrderById(orderId);

    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (order.status === newStatus) {
      return order;
    }

    const possibleNextStates = allowedTransitions[order.status] || [];
    if (!possibleNextStates.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot change order status from "${order.status}" to "${newStatus}". Valid transitions: ${possibleNextStates.join(', ') || 'none'}`,
      );
    }

    order.status = newStatus;
    return this.orderRepository.save(order);
  }

  async getDashboardOverview() {
    const totalOrders = await this.orderRepository.count();
    const pendingOrders = await this.orderRepository.count({
      where: { status: OrderStatus.PENDING },
    });
    const totalProducts = await this.productRepository.count();
    const totalCustomers = await this.userRepository.count({
      where: { role: UserRole.CUSTOMER },
    });

    const revenueResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'totalRevenue')
      .where('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .getRawOne();

    const totalRevenue = parseFloat(revenueResult?.totalRevenue || '0');

    return {
      totalOrders,
      pendingOrders,
      totalProducts,
      totalCustomers,
      totalRevenue: Number(totalRevenue.toFixed(2)),
    };
  }
}
