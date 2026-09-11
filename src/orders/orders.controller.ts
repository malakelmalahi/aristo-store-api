import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { Order } from './entities/order.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Customer Checkout
  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Checkout current user shopping cart into an Order' })
  @ApiResponse({ status: 201, description: 'Order created successfully', type: Order })
  @ApiResponse({ status: 400, description: 'Empty cart, insufficient stock, or inactive product' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async checkout(
    @CurrentUser('id') userId: string,
    @Body() checkoutDto: CheckoutDto,
  ) {
    return this.ordersService.checkout(userId, checkoutDto);
  }

  // Customer Orders List
  @Get('my-orders')
  @ApiOperation({ summary: 'Get current customer order history with pagination' })
  @ApiResponse({ status: 200, description: 'Customer orders list' })
  async findUserOrders(
    @CurrentUser('id') userId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.ordersService.findUserOrders(userId, paginationQuery);
  }

  // Customer Single Order Details
  @Get('my-orders/:id')
  @ApiOperation({ summary: 'Get details of a specific order belonging to the customer' })
  @ApiResponse({ status: 200, description: 'Customer order details', type: Order })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findUserOrderById(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
  ) {
    return this.ordersService.findUserOrderById(userId, orderId);
  }

  // Admin: List all orders with filters
  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all store orders with filters & pagination (Admin only)' })
  @ApiResponse({ status: 200, description: 'All orders list' })
  async findAllOrders(@Query() query: OrderQueryDto) {
    return this.ordersService.findAllOrders(query);
  }

  // Admin: Get any order by ID
  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get any order details by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Order details', type: Order })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOrderById(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOrderById(id);
  }

  // Admin: Update order status
  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update order status with transition rules (Admin only)' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully', type: Order })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, updateOrderStatusDto.status);
  }
}
