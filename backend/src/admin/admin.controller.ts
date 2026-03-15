import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard overview stats' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Get card inventory by product' })
  getInventory() {
    return this.adminService.getInventory();
  }

  @Get('orders')
  @ApiOperation({ summary: 'List all orders with filters' })
  getOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('email') email?: string,
  ) {
    return this.adminService.getOrders({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
      email,
    });
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get customer list with spending stats' })
  getCustomers() {
    return this.adminService.getCustomers();
  }
}
