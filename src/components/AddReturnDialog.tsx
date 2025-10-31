import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { ReturnItem } from "./ReturnCard";
import { z } from "zod";

const returnSchema = z.object({
  storeName: z.string().trim().min(1, "Store name is required").max(100, "Store name must be less than 100 characters"),
  price: z.number().positive("Price must be greater than 0").max(999999.99, "Price must be less than 1,000,000"),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  returnDate: z.string().optional(),
  returnedDate: z.string().optional(),
});

interface AddReturnDialogProps {
  onAdd: (item: Omit<ReturnItem, "id">) => void;
}

export const AddReturnDialog = ({ onAdd }: AddReturnDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    storeName: "",
    purchaseDate: "",
    returnDate: "",
    returnedDate: "",
    price: "",
    receiptImage: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate with zod schema
    const validationResult = returnSchema.safeParse({
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validate Date Returned cannot be in the future
    if (formData.returnedDate) {
      const returnedDate = new Date(formData.returnedDate);
      returnedDate.setHours(0, 0, 0, 0);
      
      if (returnedDate > today) {
        toast.error("Date returned cannot be in the future");
        return;
      }
    }

    if (formData.purchaseDate) {
      const purchaseDate = new Date(formData.purchaseDate);
      purchaseDate.setHours(0, 0, 0, 0);
      
      if (purchaseDate > today) {
        toast.error("Purchase date cannot be in the future");
        return;
      }
      
      if (formData.returnedDate) {
        const returnedDate = new Date(formData.returnedDate);
        returnedDate.setHours(0, 0, 0, 0);
        
        if (returnedDate < purchaseDate) {
          toast.error("Date returned must be on or after purchase date");
          return;
        }
      }

      if (formData.returnDate) {
        const returnDate = new Date(formData.returnDate);
        returnDate.setHours(0, 0, 0, 0);
        
        if (returnDate < purchaseDate) {
          toast.error("Return by date must be on or after purchase date");
          return;
        }
      }
    }

    onAdd({
      storeName: formData.storeName.trim(),
      purchaseDate: new Date(formData.purchaseDate),
      returnDate: formData.returnDate ? new Date(formData.returnDate) : null,
      returnedDate: formData.returnedDate ? new Date(formData.returnedDate) : null,
      price: parseFloat(formData.price),
      receiptImage: formData.receiptImage || undefined,
      status: "pending",
      refundReceived: false,
    });

    setFormData({
      storeName: "",
      purchaseDate: "",
      returnDate: "",
      returnedDate: "",
      price: "",
      receiptImage: "",
    });
    setOpen(false);
    toast.success("Return added successfully!");
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-md">
          <Plus className="w-4 h-4 mr-2" />
          Add Return
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Return</DialogTitle>
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
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="returnDate">Return By</Label>
            <Input
              id="returnDate"
              type="date"
              value={formData.returnDate}
              onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="returnedDate">Date Returned</Label>
          <Input
            id="returnedDate"
            type="date"
            value={formData.returnedDate}
            onChange={(e) => setFormData({ ...formData, returnedDate: e.target.value })}
            max={new Date().toISOString().split('T')[0]}
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

          <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90">
            Add Return
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
