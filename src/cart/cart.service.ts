import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: { items: { product: true } },
    });

    if (!cart) {
      cart = this.cartRepository.create({ userId, items: [] });
      cart = await this.cartRepository.save(cart);
    }

    return cart;
  }

  formatCartResponse(cart: Cart) {
    const items = (cart.items || []).map((item) => {
      const price = Number(item.product?.price || 0);
      const subtotal = Number((price * item.quantity).toFixed(2));
      return {
        id: item.id,
        quantity: item.quantity,
        product: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              slug: item.product.slug,
              price: item.product.price,
              stock: item.product.stock,
              imageUrl: item.product.imageUrl,
              isActive: item.product.isActive,
            }
          : null,
        subtotal,
      };
    });

    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = Number(
      items.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2),
    );

    return {
      id: cart.id,
      items,
      totalItems,
      totalPrice,
    };
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    return this.formatCartResponse(cart);
  }

  async addItem(userId: string, addCartItemDto: AddCartItemDto) {
    const { productId, quantity } = addCartItemDto;

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    if (!product.isActive) {
      throw new BadRequestException('This product is no longer active');
    }

    const cart = await this.getOrCreateCart(userId);

    let cartItem = await this.cartItemRepository.findOne({
      where: { cartId: cart.id, productId },
      relations: { product: true },
    });

    const newQuantity = (cartItem ? cartItem.quantity : 0) + quantity;

    if (newQuantity > product.stock) {
      throw new BadRequestException(
        `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${newQuantity}`,
      );
    }

    if (cartItem) {
      cartItem.quantity = newQuantity;
      await this.cartItemRepository.save(cartItem);
    } else {
      cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        productId,
        quantity,
      });
      await this.cartItemRepository.save(cartItem);
    }

    return this.getCart(userId);
  }

  async updateItemQuantity(
    userId: string,
    itemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ) {
    const cart = await this.getOrCreateCart(userId);
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: itemId, cartId: cart.id },
      relations: { product: true },
    });

    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID "${itemId}" not found in your cart`);
    }

    if (updateCartItemDto.quantity > cartItem.product.stock) {
      throw new BadRequestException(
        `Insufficient stock for "${cartItem.product.name}". Available: ${cartItem.product.stock}`,
      );
    }

    cartItem.quantity = updateCartItemDto.quantity;
    await this.cartItemRepository.save(cartItem);

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: itemId, cartId: cart.id },
    });

    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID "${itemId}" not found in your cart`);
    }

    await this.cartItemRepository.remove(cartItem);
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.cartItemRepository.delete({ cartId: cart.id });
    return this.getCart(userId);
  }
}
