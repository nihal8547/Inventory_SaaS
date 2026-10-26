import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationType {
  INFO = 'INFO',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  SALE = 'SALE',
  ORDER = 'ORDER',
  SECURITY = 'SECURITY',
  SYSTEM = 'SYSTEM',
}

export enum NotificationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export class CreateNotificationDto {
  @ApiProperty({ description: 'Notification title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Notification body message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ enum: NotificationType, default: NotificationType.INFO })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ enum: NotificationSeverity, default: NotificationSeverity.INFO })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ description: 'Internal relative navigation link, e.g. /inventory or /sales' })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional({ description: 'Target user ID, if intended for a single user' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Optional metadata payload' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}
