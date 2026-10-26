import { Badge } from "@/components/ui/badge";

type StatusType = 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' | 'draft' | 'completed' | 'cancelled' | 'in_transit' | 'low_stock' | 'out_of_stock' | string;

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'secondary' },
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  in_transit: { label: 'In Transit', variant: 'info' },
  dispatched: { label: 'Dispatched', variant: 'info' },
  received: { label: 'Received', variant: 'success' },
  partially_received: { label: 'Partial', variant: 'warning' },
  low_stock: { label: 'Low Stock', variant: 'warning' },
  out_of_stock: { label: 'Out of Stock', variant: 'destructive' },
  in_stock: { label: 'In Stock', variant: 'success' },
  ordered: { label: 'Ordered', variant: 'info' },
  reserved: { label: 'Reserved', variant: 'warning' },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] || { label: status, variant: 'secondary' as const };
  return (
    <Badge variant={config.variant as 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'} className={className}>
      {config.label}
    </Badge>
  );
}
