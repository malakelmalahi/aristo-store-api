import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address } from './entities/address.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Addresses')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all addresses of the logged-in customer' })
  @ApiResponse({ status: 200, description: 'List of customer addresses', type: [Address] })
  async findAll(@CurrentUser('id') userId: string) {
    return this.addressesService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new address for the logged-in customer' })
  @ApiResponse({ status: 201, description: 'Address created successfully', type: Address })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    return this.addressesService.create(userId, createAddressDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing address' })
  @ApiResponse({ status: 200, description: 'Address updated successfully', type: Address })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.addressesService.update(userId, id, updateAddressDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an address' })
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.addressesService.remove(userId, id);
  }
}
