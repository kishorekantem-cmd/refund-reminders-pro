import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Image as ImageIcon, Store } from "lucide-react";
import { format } from "date-fns";

export interface ReturnItem {
  id: string;
  storeName: string;
  purchaseDate: Date;
  returnDate: Date | null;
  returnedDate: Date | null;
  price: number;
  receiptImage?: string;
  hasReceipt?: boolean;
  status: "pending" | "completed";
  refundReceived?: boolean;
}

interface ReturnCardProps {
  item: ReturnItem;
  onClick?: () => void;
}

export const ReturnCard = ({ item, onClick }: ReturnCardProps) => {
  const daysSinceReturned = item.returnedDate 
    ? Math.floor((new Date().getTime() - item.returnedDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const needsRefundReminder = !item.refundReceived && item.returnedDate && daysSinceReturned >= 3;

  return (
    <Card
      className={`p-4 cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-card border-border ${needsRefundReminder ? 'border-l-4 border-l-warning' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Store className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">{item.storeName}</h3>
            <p className="text-xs text-muted-foreground">
              Purchased {format(item.purchaseDate, "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <Badge
          variant={item.status === "completed" ? "default" : "secondary"}
          className={
            item.status === "completed"
              ? "bg-gradient-success text-success-foreground"
              : "bg-warning text-warning-foreground"
          }
        >
          {item.status === "completed" ? "Completed" : "Pending"}
        </Badge>
      </div>

      <div className="space-y-2">
        {item.returnedDate && (
          <div className="flex items-center gap-2 text-sm text-success">
            <Calendar className="w-4 h-4" />
            <span>Returned: {format(item.returnedDate, "MMM d, yyyy")}</span>
          </div>
        )}

        {item.returnDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Return by: {format(item.returnDate, "MMM d, yyyy")}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4 text-accent" />
          <span className="font-semibold text-accent">
            ${item.price.toFixed(2)}
          </span>
        </div>

        {(item.receiptImage || item.hasReceipt) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="w-4 h-4" />
            <span>Receipt attached</span>
          </div>
        )}
      </div>

      {item.status === "pending" && (
        <div className="mt-3 pt-3 border-t border-border">
          {needsRefundReminder ? (
            <p className="text-xs text-warning font-medium">
              ⚠️ To check whether returned amount is received ({daysSinceReturned} days since return)
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {item.refundReceived
                ? "✓ Refund confirmed"
                : "Waiting for refund confirmation"}
            </p>
          )}
        </div>
      )}
    </Card>
  );
};
