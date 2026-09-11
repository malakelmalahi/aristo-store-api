import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Admin Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminDashboardController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get overview dashboard metrics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Summary metrics of the store',
    schema: {
      example: {
        totalOrders: 42,
        pendingOrders: 8,
        totalProducts: 30,
        totalCustomers: 18,
        totalRevenue: 1200,
      },
    },
  })
  async getDashboard() {
    return this.ordersService.getDashboardOverview();
  }
}
