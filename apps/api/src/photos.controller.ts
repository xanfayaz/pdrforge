import { Controller, Delete, Param } from '@nestjs/common';
import { CurrentUser, type AuthUser } from './common/auth-user';
import { OrdersService } from './orders/orders.service';

@Controller('photos')
export class PhotosController {
  constructor(private readonly orders: OrdersService) {}

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.removePhoto(user, id);
  }
}
