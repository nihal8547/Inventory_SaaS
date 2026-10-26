import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateNotificationDto, NotificationType, NotificationSeverity } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get notificationModel() {
    return (this.prisma as any).notification;
  }

  /**
   * Create an in-app notification
   */
  async create(tenantId: string, dto: CreateNotificationDto) {
    return this.notificationModel.create({
      data: {
        tenantId,
        userId: dto.userId || null,
        title: dto.title,
        message: dto.message,
        type: dto.type || NotificationType.INFO,
        severity: dto.severity || NotificationSeverity.INFO,
        link: dto.link || null,
        metadata: dto.metadata || undefined,
      },
    });
  }

  /**
   * Find all notifications for a tenant and optionally target user
   * Synchronously checks for low-stock products to guarantee real-time operational alerts
   */
  async findAll(tenantId: string, userId?: string, query?: QueryNotificationsDto) {
    // 1. Sync live inventory alerts (Low stock / Out of stock)
    await this.syncLowStockAlerts(tenantId);

    // 2. Build where filter
    const where: any = {
      tenantId,
      OR: [
        { userId: null },
        ...(userId ? [{ userId }] : []),
      ],
    };

    if (query?.isRead !== undefined) {
      where.isRead = query.isRead === 'true';
    }

    if (query?.type && query.type !== 'ALL') {
      where.type = query.type;
    }

    if (query?.severity) {
      where.severity = query.severity;
    }

    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 30;
    const skip = (page - 1) * limit;

    const [items, total, unreadCount] = await Promise.all([
      this.notificationModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.notificationModel.count({ where }),
      this.notificationModel.count({
        where: {
          tenantId,
          isRead: false,
          OR: [
            { userId: null },
            ...(userId ? [{ userId }] : []),
          ],
        },
      }),
    ]);

    // If completely empty, generate an initial welcome notification
    if (total === 0 && !query?.type && query?.isRead === undefined) {
      const welcome = await this.notificationModel.create({
        data: {
          tenantId,
          title: 'Welcome to InventoryOS Notification Center',
          message: 'Real-time alerts for stock levels, point of sale transactions, and store operations will appear here.',
          type: NotificationType.SYSTEM,
          severity: NotificationSeverity.INFO,
          link: '/inventory',
          metadata: { welcome: true },
        },
      });
      return {
        data: [welcome],
        total: 1,
        page: 1,
        limit,
        totalPages: 1,
        unreadCount: 1,
      };
    }

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(tenantId: string, userId?: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.notificationModel.count({
      where: {
        tenantId,
        isRead: false,
        OR: [
          { userId: null },
          ...(userId ? [{ userId }] : []),
        ],
      },
    });
    return { unreadCount };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(tenantId: string, id: string) {
    const existing = await this.notificationModel.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return this.notificationModel.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all unread notifications as read for tenant/user
   */
  async markAllAsRead(tenantId: string, userId?: string) {
    const result = await this.notificationModel.updateMany({
      where: {
        tenantId,
        isRead: false,
        OR: [
          { userId: null },
          ...(userId ? [{ userId }] : []),
        ],
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      success: true,
      updatedCount: result.count,
    };
  }

  /**
   * Delete a single notification
   */
  async delete(tenantId: string, id: string) {
    const existing = await this.notificationModel.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    await this.notificationModel.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Clear all read notifications
   */
  async deleteAllRead(tenantId: string, userId?: string) {
    const result = await this.notificationModel.deleteMany({
      where: {
        tenantId,
        isRead: true,
        OR: [
          { userId: null },
          ...(userId ? [{ userId }] : []),
        ],
      },
    });

    return {
      success: true,
      deletedCount: result.count,
    };
  }

  /**
   * Operational Inventory Scanner:
   * Checks for products with low stock balances and creates actionable alerts.
   */
  private async syncLowStockAlerts(tenantId: string) {
    try {
      const stockBalances = await this.prisma.stockBalance.findMany({
        where: {
          tenantId,
        },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          branch: { select: { id: true, name: true } },
        },
        take: 50,
      });

      for (const balance of stockBalances) {
        const onHand = Number(balance.onHand);
        const reorderLevel = balance.reorderLevel ? Number(balance.reorderLevel) : 10;

        if (onHand <= reorderLevel) {
          const isOutOfStock = onHand <= 0;
          const alertType = isOutOfStock ? NotificationType.OUT_OF_STOCK : NotificationType.LOW_STOCK;

          // Check if an unread alert for this product & branch already exists in last 24h
          const oneDayAgo = new Date();
          oneDayAgo.setHours(oneDayAgo.getHours() - 24);

          const existingAlert = await this.notificationModel.findFirst({
            where: {
              tenantId,
              type: alertType,
              createdAt: { gte: oneDayAgo },
              metadata: {
                path: ['productId'],
                equals: balance.productId,
              },
            },
          });

          if (!existingAlert) {
            await this.notificationModel.create({
              data: {
                tenantId,
                title: isOutOfStock
                  ? `Out of Stock: ${balance.product.name}`
                  : `Low Stock Warning: ${balance.product.name}`,
                message: isOutOfStock
                  ? `${balance.product.name} (${balance.product.sku}) has zero stock at ${balance.branch?.name || 'warehouse'}. Urgent reorder needed.`
                  : `${balance.product.name} is running low (${onHand} remaining) at ${balance.branch?.name || 'store'}. Threshold: ${reorderLevel}.`,
                type: alertType,
                severity: isOutOfStock ? NotificationSeverity.ERROR : NotificationSeverity.WARNING,
                link: '/inventory',
                metadata: {
                  productId: balance.productId,
                  sku: balance.product.sku,
                  branchId: balance.branchId,
                  branchName: balance.branch?.name,
                  onHand,
                  reorderLevel,
                },
              },
            });
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to sync low stock alerts: ${err?.message}`);
    }
  }
}
