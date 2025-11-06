import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Upload, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { ReturnItem } from "./ReturnCard";
import { z } from "zod";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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
    price: "",
    receiptImage: "",
  });
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>();
  const [returnByDate, setReturnByDate] = useState<Date | undefined>();
  const [dateReturned, setDateReturned] = useState<Date | undefined>();
  const [purchaseCalendarOpen, setPurchaseCalendarOpen] = useState(false);
  const [returnByCalendarOpen, setReturnByCalendarOpen] = useState(false);
  const [returnedCalendarOpen, setReturnedCalendarOpen] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!purchaseDate) {
      toast.error("Purchase date is required");
      return;
    }

    // Validate with zod schema
    const validationResult = returnSchema.safeParse({
      storeName: formData.storeName,
      price: parseFloat(formData.price),
      purchaseDate: format(purchaseDate, 'yyyy-MM-dd'),
      returnDate: returnByDate ? format(returnByDate, 'yyyy-MM-dd') : undefined,
      returnedDate: dateReturned ? format(dateReturned, 'yyyy-MM-dd') : undefined,
    });

    if (!validationResult.success) {
      const errors = validationResult.error.errors;
      toast.error(errors[0]?.message || "Please check your inputs");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validate Date Returned cannot be in the future
    if (dateReturned) {
      const checkReturned = new Date(dateReturned);
      checkReturned.setHours(0, 0, 0, 0);
      
      if (checkReturned > today) {
        toast.error("Date returned cannot be in the future");
        return;
      }
    }

    const checkPurchase = new Date(purchaseDate);
    checkPurchase.setHours(0, 0, 0, 0);
    
    if (checkPurchase > today) {
      toast.error("Purchase date cannot be in the future");
      return;
    }
    
    if (dateReturned) {
      const checkReturned = new Date(dateReturned);
      checkReturned.setHours(0, 0, 0, 0);
      
      if (checkReturned < checkPurchase) {
        toast.error("Date returned must be on or after purchase date");
        return;
      }
    }

    if (returnByDate) {
      const checkReturnBy = new Date(returnByDate);
      checkReturnBy.setHours(0, 0, 0, 0);
      
      if (checkReturnBy < today) {
        toast.error("Return by date cannot be in the past");
        return;
      }
      
      if (checkReturnBy < checkPurchase) {
        toast.error("Return by date must be on or after purchase date");
        return;
      }
    }

    // Check return limit (25 per user)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { count, error: countError } = await supabase
          .from('returns')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (countError) {
          console.error('Error checking return count:', countError);
          toast.error("Failed to verify return limit. Please try again.");
          return;
        }

        if (count !== null && count >= 25) {
          toast.error("Maximum return limit reached (25 per user). Please delete old returns to add new ones.");
          return;
        }
      }
    } catch (error) {
      console.error('Error checking return limit:', error);
      toast.error("Failed to verify return limit. Please try again.");
      return;
    }

    onAdd({
      storeName: formData.storeName.trim(),
      purchaseDate: purchaseDate,
      returnDate: returnByDate || null,
      returnedDate: dateReturned || null,
      price: parseFloat(formData.price),
      receiptImage: formData.receiptImage || undefined,
      status: "pending",
      refundReceived: false,
    });

    setFormData({
      storeName: "",
      price: "",
      receiptImage: "",
    });
    setPurchaseDate(undefined);
    setReturnByDate(undefined);
    setDateReturned(undefined);
    setOpen(false);
    toast.success("Return added successfully!");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image is too large. Please use an image smaller than 5MB');
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const img = new Image();
        img.onload = async () => {
          // Create canvas to resize image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate new dimensions (max 1200px width/height)
          let width = img.width;
          let height = img.height;
          const maxDimension = 1200;
          
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress image
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          setFormData(prev => ({ ...prev, receiptImage: compressedDataUrl }));
          toast.success('Receipt image uploaded');

          // Extract receipt information using OCR
          setIsProcessingOCR(true);
          toast.info('Extracting receipt information...');

          try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-receipt-info`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({ imageData: compressedDataUrl }),
              }
            );

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to extract receipt info');
            }

            const extractedData = await response.json();
            console.log('Extracted data:', extractedData);

            // Auto-fill form fields
            if (extractedData.storeName) {
              setFormData(prev => ({ ...prev, storeName: extractedData.storeName }));
            }
            if (extractedData.amount) {
              setFormData(prev => ({ ...prev, price: extractedData.amount.toString() }));
            }
            if (extractedData.purchaseDate) {
              try {
                const [month, day, year] = extractedData.purchaseDate.split('/');
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) {
                  setPurchaseDate(date);
                }
              } catch (err) {
                console.error('Error parsing purchase date:', err);
              }
            }
            if (extractedData.returnByDate) {
              try {
                const [month, day, year] = extractedData.returnByDate.split('/');
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) {
                  setReturnByDate(date);
                }
              } catch (err) {
                console.error('Error parsing return by date:', err);
              }
            }

            toast.success('Receipt info extracted! Please review and edit if needed.');
          } catch (error) {
            console.error('OCR Error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to extract receipt info. Please fill manually.');
          } finally {
            setIsProcessingOCR(false);
          }
        };
        img.onerror = () => {
          toast.error('Failed to process image');
          e.target.value = '';
        };
        img.src = reader.result as string;
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
        e.target.value = '';
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
            <Label>Purchase Date *</Label>
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
                    const checkDate = new Date(date);
                    today.setHours(0, 0, 0, 0);
                    checkDate.setHours(0, 0, 0, 0);
                    return checkDate.getTime() > today.getTime();
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Return By</Label>
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
          <Label>Date Returned</Label>
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
                disabled={isProcessingOCR}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("receipt")?.click()}
                className="w-full"
                disabled={isProcessingOCR}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isProcessingOCR ? "Processing..." : formData.receiptImage ? "Change Receipt" : "Upload Receipt"}
              </Button>
            </div>
            {formData.receiptImage && (
              <p className="text-xs text-success">✓ Receipt uploaded - Info auto-extracted</p>
            )}
            {isProcessingOCR && (
              <p className="text-xs text-muted-foreground">🔍 Extracting receipt information...</p>
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
