import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar as CalendarIcon, DollarSign, Store, CheckCircle2, XCircle, Pencil } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ReturnItem } from "./ReturnCard";
import { useState } from "react";

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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedReturnDate, setSelectedReturnDate] = useState<Date | undefined>(undefined);
  
  if (!item) return null;

  const handleConfirmRefund = () => {
    // If there's no returned date, add it first
    if (!item.returnedDate && selectedReturnDate) {
      onMarkReturned(item.id, selectedReturnDate);
      setShowConfirmDialog(false);
      setSelectedReturnDate(undefined);
      // Don't close the main dialog - let user see the updated date
      return;
    }
    
    // If we're confirming refund received
    onToggleRefund(item.id);
    onMarkComplete(item.id);
    setShowConfirmDialog(false);
    setSelectedReturnDate(undefined);
    onOpenChange(false);
  };

  const daysSinceReturned = item.returnedDate 
    ? Math.floor((new Date().getTime() - item.returnedDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const needsRefundReminder = !item.refundReceived && item.returnedDate && daysSinceReturned >= 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Return Details</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
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
            {item.purchaseDate && (
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Purchase Date</span>
                </div>
                <p className="text-lg font-semibold">
                  {format(item.purchaseDate, "MMMM d, yyyy")}
                </p>
              </div>
            )}

            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <CalendarIcon className={`w-4 h-4 ${item.returnedDate ? 'text-success' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium">Date Returned</span>
              </div>
              {item.returnedDate ? (
                <p className="text-lg font-semibold">
                  {format(item.returnedDate, "MMMM d, yyyy")}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Not yet added - Use button below to add
                </p>
              )}
            </div>

            {item.returnDate && (
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Return Deadline (Optional)</span>
                </div>
                <p className="text-lg font-semibold">
                  {format(item.returnDate, "MMMM d, yyyy")}
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
                  ⚠️ To check whether returned amount is received ({daysSinceReturned} days since return)
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {item.status === "pending" && !item.refundReceived && !item.returnedDate && (
              <Button
                onClick={() => setShowConfirmDialog(true)}
                className="w-full bg-gradient-success hover:opacity-90"
              >
                Mark as Returned
              </Button>
            )}
            {item.returnedDate && item.returnDate && !item.refundReceived && (
              <Button
                onClick={() => setShowConfirmDialog(true)}
                className="w-full bg-gradient-success hover:opacity-90"
              >
                Confirm Refund Received
              </Button>
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
        </ScrollArea>
      </DialogContent>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {!item.returnedDate ? "Add Date Returned" : "Confirm Refund Received"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {!item.returnedDate 
                ? "Please select the date when you returned the item."
                : "Are you sure you want to mark this refund as received? This will complete the return and stop any reminders."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {!item.returnedDate && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="w-full border rounded-lg overflow-hidden bg-background">
                <Calendar
                  mode="single"
                  selected={selectedReturnDate}
                  onSelect={setSelectedReturnDate}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    // Disable future dates
                    if (date > today) return true;
                    
                    // Disable dates before purchase date
                    if (item.purchaseDate) {
                      const purchaseDate = new Date(item.purchaseDate);
                      purchaseDate.setHours(0, 0, 0, 0);
                      if (date < purchaseDate) return true;
                    }
                    
                    return false;
                  }}
                  defaultMonth={new Date()}
                  toDate={new Date()}
                  fromDate={item.purchaseDate || undefined}
                  initialFocus
                  className="w-full"
                />
              </div>
              {selectedReturnDate && (
                <div className="w-full p-3 bg-primary/10 rounded-md text-center">
                  <p className="text-sm font-medium">
                    Selected: {format(selectedReturnDate, "MMMM d, yyyy")}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedReturnDate(undefined)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmRefund}
              disabled={!item.returnedDate && !selectedReturnDate}
            >
              {!item.returnedDate ? "Confirm Returned" : "Confirm Refund Received"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
