import { api } from '@/lib/api';
import { NotificationsResponse, AppNotification, NotificationQuery } from '@/types';

export const notificationsService = {
  list: (params?: NotificationQuery) =>
    api.get<NotificationsResponse>('/notifications', params as Record<string, unknown>),

  getUnreadCount: () =>
    api.get<{ unreadCount: number }>('/notifications/unread-count'),

  markAsRead: (id: string) =>
    api.patch<AppNotification>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.patch<{ success: boolean; updatedCount: number }>('/notifications/read-all'),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/notifications/${id}`),

  clearRead: () =>
    api.delete<{ success: boolean; deletedCount: number }>('/notifications/clear-read'),

  create: (data: {
    title: string;
    message: string;
    type?: string;
    severity?: string;
    link?: string;
    metadata?: any;
  }) => api.post<AppNotification>('/notifications', data),
};
