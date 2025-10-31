import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { ReturnItem } from "./ReturnCard";
import { z } from "zod";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const editReturnSchema = z.object({
  storeName: z.string().trim().min(1, "Store name is required").max(100, "Store name must be less than 100 characters"),
  price: z.number().positive("Price must be greater than 0").max(999999.99, "Price must be less than 1,000,000"),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  returnDate: z.string().optional(),
  returnedDate: z.string().optional(),
});

interface EditReturnDialogProps {
  item: ReturnItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: Partial<ReturnItem>) => void;
}

export const EditReturnDialog = ({ item, open, onOpenChange, onSave }: EditReturnDialogProps) => {
  const [formData, setFormData] = useState({
    storeName: "",
    price: "",
    receiptImage: "",
  });
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>();
  const [returnByDate, setReturnByDate] = useState<Date | undefined>();
  const [dateReturned, setDateReturned] = useState<Date | undefined>();
  const [purchaseCalendarOpen, setPurchaseCalendarOpen] = useState(false);
  const [returnByCalendarOpen, setReturnByCalendarOpen] = useState(false);
  const [returnedCalendarOpen, setReturnedCalendarOpen] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        storeName: item.storeName,
        price: item.price.toString(),
        receiptImage: item.receiptImage || "",
      });
      
      // Validate purchase date - cap to today if it's in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (item.purchaseDate) {
        const purchaseDate = new Date(item.purchaseDate);
        purchaseDate.setHours(0, 0, 0, 0);
        
        // If purchase date is in the future, cap it to today
        if (purchaseDate > today) {
          setPurchaseDate(today);
        } else {
          setPurchaseDate(purchaseDate);
        }
      } else {
        setPurchaseDate(undefined);
      }
      
      setReturnByDate(item.returnDate ? new Date(item.returnDate) : undefined);
      setDateReturned(item.returnedDate ? new Date(item.returnedDate) : undefined);
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!item) return;

    if (!purchaseDate) {
      toast.error("Purchase date is required");
      return;
    }

    // Format dates to yyyy-MM-dd for validation
    const purchaseDateStr = format(purchaseDate, "yyyy-MM-dd");
    const returnDateStr = returnByDate ? format(returnByDate, "yyyy-MM-dd") : undefined;
    const returnedDateStr = dateReturned ? format(dateReturned, "yyyy-MM-dd") : undefined;

    // Validate with zod schema
    const validationResult = editReturnSchema.safeParse({
      storeName: formData.storeName,
      price: parseFloat(formData.price),
      purchaseDate: purchaseDateStr,
      returnDate: returnDateStr,
      returnedDate: returnedDateStr,
    });

    if (!validationResult.success) {
      const errors = validationResult.error.errors;
      toast.error(errors[0]?.message || "Please check your inputs");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const purchaseDateCheck = new Date(purchaseDate);
    purchaseDateCheck.setHours(0, 0, 0, 0);

    if (purchaseDateCheck > today) {
      toast.error("Purchase date cannot be in the future");
      return;
    }

    // Validate Date Returned cannot be in the future
    if (dateReturned) {
      const returnedDateCheck = new Date(dateReturned);
      returnedDateCheck.setHours(0, 0, 0, 0);
      
      if (returnedDateCheck > today) {
        toast.error("Date returned cannot be in the future");
        return;
      }
      
      if (returnedDateCheck < purchaseDateCheck) {
        toast.error("Date returned must be on or after purchase date");
        return;
      }
    }

    if (returnByDate) {
      const selectedDate = new Date(returnByDate);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        toast.error("Return by date cannot be in the past");
        return;
      }
      
      if (selectedDate < purchaseDateCheck) {
        toast.error("Return by date must be on or after purchase date");
        return;
      }
    }

    onSave(item.id, {
      storeName: formData.storeName.trim(),
      purchaseDate: new Date(purchaseDate),
      returnDate: returnByDate || null,
      returnedDate: dateReturned ? new Date(dateReturned) : null,
      price: parseFloat(formData.price),
      receiptImage: formData.receiptImage || undefined,
    });

    onOpenChange(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, receiptImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Return</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="storeName">Store Name *</Label>
            <Input
              id="storeName"
              value={formData.storeName}
              onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
              placeholder="e.g., Amazon, Target"
              maxLength={100}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Purchase Date *</Label>
              <Popover open={purchaseCalendarOpen} onOpenChange={setPurchaseCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !purchaseDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {purchaseDate ? format(purchaseDate, "MM/dd/yyyy") : <span>mm/dd/yyyy</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={purchaseDate}
                    onSelect={(date) => {
                      setPurchaseDate(date);
                      setPurchaseCalendarOpen(false);
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(23, 59, 59, 999);
                      return date > today;
                    }}
                    defaultMonth={new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnDate">Return By (Optional)</Label>
              <Popover open={returnByCalendarOpen} onOpenChange={setReturnByCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !returnByDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {returnByDate ? format(returnByDate, "MM/dd/yyyy") : <span>mm/dd/yyyy</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={returnByDate}
                    onSelect={(date) => {
                      setReturnByDate(date);
                      setReturnByCalendarOpen(false);
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      const checkDate = new Date(date);
                      today.setHours(0, 0, 0, 0);
                      checkDate.setHours(0, 0, 0, 0);
                      return checkDate.getTime() < today.getTime();
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="returnedDate">Date Returned</Label>
            <Popover open={returnedCalendarOpen} onOpenChange={setReturnedCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateReturned && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateReturned ? format(dateReturned, "MM/dd/yyyy") : <span>mm/dd/yyyy</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateReturned}
                  onSelect={(date) => {
                    setDateReturned(date);
                    setReturnedCalendarOpen(false);
                  }}
                  disabled={{ 
                    from: (() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setHours(0, 0, 0, 0);
                      return tomorrow;
                    })()
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Item Price *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              max="999999.99"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt">Receipt Image (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="receipt"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("receipt")?.click()}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {formData.receiptImage ? "Change Receipt" : "Upload Receipt"}
              </Button>
            </div>
            {formData.receiptImage && (
              <p className="text-xs text-success">✓ Receipt uploaded</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              Cancel
            </Button>
            <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
