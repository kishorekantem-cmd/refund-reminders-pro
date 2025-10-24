import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { ReturnItem } from "./ReturnCard";
import { z } from "zod";

const editReturnSchema = z.object({
  storeName: z.string().trim().min(1, "Store name is required").max(100, "Store name must be less than 100 characters"),
  price: z.number().positive("Price must be greater than 0").max(999999.99, "Price must be less than 1,000,000"),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  returnDate: z.string().optional(),
  returnedDate: z.string().min(1, "Date returned is required"),
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
    purchaseDate: "",
    returnDate: "",
    returnedDate: "",
    price: "",
    receiptImage: "",
  });

  useEffect(() => {
    if (item) {
      setFormData({
        storeName: item.storeName,
        purchaseDate: item.purchaseDate.toISOString().split('T')[0],
        returnDate: item.returnDate ? item.returnDate.toISOString().split('T')[0] : "",
        returnedDate: item.returnedDate ? item.returnedDate.toISOString().split('T')[0] : "",
        price: item.price.toString(),
        receiptImage: item.receiptImage || "",
      });
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!item) return;

    // Validate with zod schema
    const validationResult = editReturnSchema.safeParse({
      storeName: formData.storeName,
      price: parseFloat(formData.price),
      purchaseDate: formData.purchaseDate,
      returnDate: formData.returnDate,
      returnedDate: formData.returnedDate,
    });

    if (!validationResult.success) {
      const errors = validationResult.error.errors;
      toast.error(errors[0]?.message || "Please check your inputs");
      return;
    }

    const purchaseDate = new Date(formData.purchaseDate);
    const returnedDate = new Date(formData.returnedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (returnedDate < purchaseDate) {
      toast.error("Date returned must be on or after purchase date");
      return;
    }

    if (returnedDate > today) {
      toast.error("Date returned cannot be in the future");
      return;
    }

    if (formData.returnDate) {
      const returnDate = new Date(formData.returnDate);
      
      if (returnDate < purchaseDate) {
        toast.error("Return by date must be on or after purchase date");
        return;
      }
    }

    onSave(item.id, {
      storeName: formData.storeName.trim(),
      purchaseDate: new Date(formData.purchaseDate),
      returnDate: formData.returnDate ? new Date(formData.returnDate) : null,
      returnedDate: new Date(formData.returnedDate),
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
              <Input
                id="purchaseDate"
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnDate">Return By (Optional)</Label>
              <Input
                id="returnDate"
                type="date"
                value={formData.returnDate}
                onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="returnedDate">Date Returned *</Label>
            <Input
              id="returnedDate"
              type="date"
              value={formData.returnedDate}
              onChange={(e) => setFormData({ ...formData, returnedDate: e.target.value })}
              required
            />
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
