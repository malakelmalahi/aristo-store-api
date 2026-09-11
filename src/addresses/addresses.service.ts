import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
  ) {}

  async create(userId: string, createAddressDto: CreateAddressDto): Promise<Address> {
    const count = await this.addressRepository.count({ where: { userId } });
    const isDefault = count === 0 ? true : !!createAddressDto.isDefault;

    if (isDefault) {
      await this.addressRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
    }

    const address = this.addressRepository.create({
      ...createAddressDto,
      userId,
      isDefault,
    });

    return this.addressRepository.save(address);
  }

  async findAll(userId: string): Promise<Address[]> {
    return this.addressRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Address> {
    const address = await this.addressRepository.findOne({
      where: { id, userId },
    });
    if (!address) {
      throw new NotFoundException(`Address with ID "${id}" not found`);
    }
    return address;
  }

  async update(
    userId: string,
    id: string,
    updateAddressDto: UpdateAddressDto,
  ): Promise<Address> {
    const address = await this.findOne(userId, id);

    if (updateAddressDto.isDefault) {
      await this.addressRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(address, updateAddressDto);
    return this.addressRepository.save(address);
  }

  async remove(userId: string, id: string): Promise<{ message: string }> {
    const address = await this.findOne(userId, id);
    await this.addressRepository.remove(address);
    return { message: 'Address deleted successfully' };
  }
}
