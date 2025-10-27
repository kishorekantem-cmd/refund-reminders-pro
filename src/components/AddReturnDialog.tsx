import { useState, useRef } from "react";
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== FORM SUBMIT START ===');
    console.log('isProcessingImage:', isProcessingImage);
    console.log('isProcessingRef.current:', isProcessingRef.current);
    console.log('hasImage:', !!formData.receiptImage);
    console.log('imageSize:', formData.receiptImage?.length || 0);
    
    if (isProcessingRef.current || isProcessingImage) {
      console.log('BLOCKED: Image still processing');
      toast.error("Please wait for image to finish processing");
      return;
    }
    
    console.log('Proceeding with validation...');
    
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
      console.error('Validation failed:', errors);
      toast.error(errors[0]?.message || "Please check your inputs");
      return;
    }
    
    console.log('Validation passed, proceeding with date checks...');

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

    console.log('All validations passed, calling onAdd...');
    onAdd({
      storeName: formData.storeName.trim(),
      purchaseDate: new Date(formData.purchaseDate),
      returnDate: formData.returnDate ? new Date(formData.returnDate) : null,
      returnedDate: new Date(formData.returnedDate),
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

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log('Starting compression for file:', file.name, file.size);
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('File read complete, creating image');
        const img = new Image();
        img.onload = () => {
          console.log('Image loaded, dimensions:', img.width, 'x', img.height);
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('Failed to get canvas context');
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

          console.log('Resizing to:', width, 'x', height);
          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with compression (0.7 quality for good balance)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          console.log('Compression complete, new size:', compressedBase64.length);
          resolve(compressedBase64);
        };
        img.onerror = (err) => {
          console.error('Image load error:', err);
          reject(new Error('Failed to load image'));
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => {
        console.error('File read error:', err);
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('=== IMAGE UPLOAD START ===');
    console.log('File selected:', file?.name, 'Size:', file?.size);
    
    if (file) {
      // Check file size (max 10MB before compression)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        console.log('File too large:', file.size);
        toast.error("Image too large. Please choose an image smaller than 10MB.");
        e.target.value = '';
        return;
      }

      isProcessingRef.current = true;
      setIsProcessingImage(true);
      console.log('Set processing flags to true');
      toast.loading("Compressing image...", { id: "image-processing" });
      
      try {
        console.log('Starting compression...');
        const compressedImage = await compressImage(file);
        console.log('Compression complete, size:', compressedImage.length);
        console.log('Updating form data...');
        setFormData(prev => ({ ...prev, receiptImage: compressedImage }));
        console.log('Form data updated');
        isProcessingRef.current = false;
        setIsProcessingImage(false);
        console.log('Set processing flags to false');
        toast.success("Receipt image uploaded", { id: "image-processing" });
      } catch (error) {
        console.error('Compression failed:', error);
        toast.error("Failed to process image", { id: "image-processing" });
        isProcessingRef.current = false;
        setIsProcessingImage(false);
        e.target.value = '';
      }
    } else {
      console.log('No file selected');
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
