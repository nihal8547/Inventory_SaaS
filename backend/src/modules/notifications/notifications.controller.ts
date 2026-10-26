import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant, CurrentUser } from '../../common/decorators/tenant.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current tenant/user' })
  findAll(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Query() query: QueryNotificationsDto
  ) {
    return this.notificationsService.findAll(tenantId, user?.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get current unread notifications count' })
  getUnreadCount(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any
  ) {
    return this.notificationsService.getUnreadCount(tenantId, user?.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any
  ) {
    return this.notificationsService.markAllAsRead(tenantId, user?.id);
  }

  @Delete('clear-read')
  @ApiOperation({ summary: 'Clear all read notifications' })
  deleteAllRead(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any
  ) {
    return this.notificationsService.deleteAllRead(tenantId, user?.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  markAsRead(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string
  ) {
    return this.notificationsService.markAsRead(tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a single notification' })
  delete(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string
  ) {
    return this.notificationsService.delete(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a notification' })
  create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateNotificationDto
  ) {
    return this.notificationsService.create(tenantId, dto);
  }
}
