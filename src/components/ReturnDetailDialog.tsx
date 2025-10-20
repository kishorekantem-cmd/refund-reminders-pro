import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Store, CheckCircle2, XCircle, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ReturnItem } from "./ReturnCard";

interface ReturnDetailDialogProps {
  item: ReturnItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleRefund: (id: string) => void;
  onMarkComplete: (id: string) => void;
  onMarkReturned: (id: string, date: Date) => void;
  onEdit: (item: ReturnItem) => void;
  onDelete: (id: string) => void;
}

export const ReturnDetailDialog = ({
  item,
  open,
  onOpenChange,
  onToggleRefund,
  onMarkComplete,
  onMarkReturned,
  onEdit,
  onDelete,
}: ReturnDetailDialogProps) => {
  if (!item) return null;

  const daysSinceReturned = item.returnedDate 
    ? Math.floor((new Date().getTime() - item.returnedDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const needsRefundReminder = item.returnedDate && !item.refundReceived && daysSinceReturned !== null && daysSinceReturned >= 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Return Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Store className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{item.storeName}</h3>
                <p className="text-sm text-muted-foreground">Store Information</p>
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

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Purchase Date</span>
              </div>
              <p className="text-lg font-semibold">
                {format(item.purchaseDate, "MMMM d, yyyy")}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Return Deadline</span>
              </div>
              <p className="text-lg font-semibold">
                {format(item.returnDate, "MMMM d, yyyy")}
              </p>
            </div>

            {item.returnedDate && (
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium">Actually Returned On</span>
                </div>
                <p className="text-lg font-semibold">
                  {format(item.returnedDate, "MMMM d, yyyy")}
                </p>
              </div>
            )}

            <div className="p-4 rounded-lg bg-accent/10">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium">Item Price</span>
              </div>
              <p className="text-2xl font-bold text-accent">
                ${item.price.toFixed(2)}
              </p>
            </div>

            {item.receiptImage && (
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-sm font-medium mb-2">Receipt Image</p>
                <img
                  src={item.receiptImage}
                  alt="Receipt"
                  className="w-full rounded-lg border border-border"
                />
              </div>
            )}

            <div className={`p-4 rounded-lg ${needsRefundReminder ? 'bg-warning/10 border border-warning' : 'bg-secondary/50'}`}>
              <p className="text-sm font-medium mb-2">Refund Status</p>
              <div className="flex items-center gap-2">
                {item.refundReceived ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <XCircle className="w-5 h-5 text-warning" />
                )}
                <span className="text-sm">
                  {item.refundReceived ? "Refund Confirmed" : "Refund Pending"}
                </span>
              </div>
              {needsRefundReminder && (
                <p className="text-xs text-warning font-medium mt-2">
                  ⚠️ {daysSinceReturned} days since return - Check if refund received!
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {item.status === "pending" && (
              <>
                {!item.returnedDate && (
                  <Button
                    onClick={() => onMarkReturned(item.id, new Date())}
                    variant="outline"
                    className="w-full"
                  >
                    Mark as Returned Today
                  </Button>
                )}
                <Button
                  onClick={() => onToggleRefund(item.id)}
                  variant="outline"
                  className="w-full"
                >
                  {item.refundReceived ? "Mark Refund as Pending" : "Confirm Refund Received"}
                </Button>
                <Button
                  onClick={() => onMarkComplete(item.id)}
                  className="w-full bg-gradient-success hover:opacity-90"
                >
                  Mark as Complete
                </Button>
              </>
            )}
            <Button
              onClick={() => {
                onEdit(item);
                onOpenChange(false);
              }}
              variant="outline"
              className="w-full"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit Return
            </Button>
            <Button
              onClick={() => onDelete(item.id)}
              variant="destructive"
              className="w-full"
            >
              Delete Return
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
