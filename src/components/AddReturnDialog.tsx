import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { ReturnItem } from "./ReturnCard";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { saveReceiptImage } from "@/lib/imageStorage";

const returnSchema = z.object({
  storeName: z.string().trim().min(1, "Store name is required").max(100, "Store name must be less than 100 characters"),
  price: z.number().positive("Price must be greater than 0").max(999999.99, "Price must be less than 1,000,000"),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  returnDate: z.string().optional(),
  returnedDate: z.string().min(1, "Date returned is required"),
});

interface AddReturnDialogProps {
  onAdd: (item: Omit<ReturnItem, "id">) => void;
}

export const AddReturnDialog = ({ onAdd }: AddReturnDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const isProcessingRef = useRef(false);
  const [formData, setFormData] = useState({
    storeName: "",
    purchaseDate: "",
    returnDate: "",
    returnedDate: "",
    price: "",
    receiptImage: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isProcessingRef.current || isProcessingImage) {
      toast.error("Please wait for image to finish processing");
      return;
    }
    
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
    
    const newReturn = {
      store_name: formData.storeName.trim(),
      item_name: formData.storeName.trim(), // Using store name as item name for now
      purchase_date: formData.purchaseDate,
      return_date: formData.returnDate || null,
      returned_date: formData.returnedDate,
      amount: parseFloat(formData.price),
      refund_received: false,
      has_receipt: !!formData.receiptImage,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    };

    const { data, error } = await supabase
      .from("returns")
      .insert([newReturn])
      .select()
      .single();

    if (error) {
      toast.error("Failed to add return");
      return;
    }

    if (data) {
      // Store image locally if present
      if (formData.receiptImage) {
        try {
          await saveReceiptImage(data.id, formData.receiptImage);
        } catch (err) {
          console.error('Failed to save receipt image:', err);
          toast.error("Return added but failed to save receipt image");
        }
      }
      
      onAdd({
        ...data,
        storeName: data.store_name,
        purchaseDate: new Date(data.purchase_date),
        returnDate: data.return_date ? new Date(data.return_date) : null,
        returnedDate: new Date(data.returned_date),
        price: Number(data.amount),
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
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      const timeout = setTimeout(() => {
        reject(new Error('Image processing timeout - file too large'));
      }, 30000); // 30 second timeout
      
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              clearTimeout(timeout);
              reject(new Error('Failed to get canvas context'));
              return;
            }

            // Calculate new dimensions (max 1200px width for receipts)
            const maxWidth = 1200;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to base64 with compression (0.6 quality for better compression on mobile)
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
            
            // Validate result
            if (!compressedBase64 || compressedBase64.length < 100) {
              clearTimeout(timeout);
              reject(new Error('Image compression produced invalid result'));
              return;
            }
            
            clearTimeout(timeout);
            resolve(compressedBase64);
          } catch (err) {
            clearTimeout(timeout);
            reject(err);
          }
        };
        img.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Failed to load image'));
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      // Check file size (max 10MB before compression)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("Image too large. Please choose an image smaller than 10MB.");
        e.target.value = '';
        return;
      }

      isProcessingRef.current = true;
      setIsProcessingImage(true);
      toast.loading("Compressing image...", { id: "image-processing" });
      
      try {
        const compressedImage = await compressImage(file);
        
        // Validate compressed image
        if (!compressedImage || compressedImage.length < 100) {
          throw new Error('Invalid compressed image');
        }
        
        // Use functional setState to ensure update
        setFormData(prev => ({ ...prev, receiptImage: compressedImage }));
        
        // Wait longer for state update on mobile devices
        await new Promise(resolve => setTimeout(resolve, 300));
        
        isProcessingRef.current = false;
        setIsProcessingImage(false);
        toast.success("Receipt uploaded! You can now submit.", { id: "image-processing" });
      } catch (error) {
        toast.error("Failed to process image. Please try a smaller image.", { id: "image-processing" });
        isProcessingRef.current = false;
        setIsProcessingImage(false);
        e.target.value = '';
        // Clear the failed image from state
        setFormData(prev => ({ ...prev, receiptImage: "" }));
      }
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

          <Button 
            type="submit" 
            className="w-full bg-gradient-primary hover:opacity-90"
            disabled={isProcessingImage}
          >
            {isProcessingImage ? "Processing image..." : "Add Return"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
