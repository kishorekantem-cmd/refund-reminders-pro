import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { ReturnItem } from "./ReturnCard";

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
        returnDate: item.returnDate.toISOString().split('T')[0],
        returnedDate: item.returnedDate ? item.returnedDate.toISOString().split('T')[0] : "",
        price: item.price.toString(),
        receiptImage: item.receiptImage || "",
      });
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!item) return;

    if (!formData.storeName || !formData.purchaseDate || !formData.returnDate || !formData.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    const purchaseDate = new Date(formData.purchaseDate);
    const returnDate = new Date(formData.returnDate);

    if (returnDate <= purchaseDate) {
      toast.error("Return date must be after purchase date");
      return;
    }

    onSave(item.id, {
      storeName: formData.storeName,
      purchaseDate: new Date(formData.purchaseDate),
      returnDate: new Date(formData.returnDate),
      returnedDate: formData.returnedDate ? new Date(formData.returnedDate) : null,
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
      <DialogContent className="sm:max-w-[425px]">
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
              <Label htmlFor="returnDate">Return By *</Label>
              <Input
                id="returnDate"
                type="date"
                value={formData.returnDate}
                onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="returnedDate">Returned On</Label>
            <Input
              id="returnedDate"
              type="date"
              value={formData.returnedDate}
              onChange={(e) => setFormData({ ...formData, returnedDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Item Price *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
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
