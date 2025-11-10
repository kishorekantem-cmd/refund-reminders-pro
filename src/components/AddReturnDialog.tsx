import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Camera, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { ReturnItem } from "./ReturnCard";
import { z } from "zod";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';

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

    // Reset form state
    setFormData({
      storeName: "",
      price: "",
      receiptImage: "",
    });
    setPurchaseDate(undefined);
    setReturnByDate(undefined);
    setDateReturned(undefined);
    
    // Close dialog after successful submission
    setOpen(false);
  };

  const handleCancel = () => {
    // Allow closing when user explicitly clicks Cancel
    setFormData({
      storeName: "",
      price: "",
      receiptImage: "",
    });
    setPurchaseDate(undefined);
    setReturnByDate(undefined);
    setDateReturned(undefined);
    setOpen(false);
  };

  const handleTakePhoto = async () => {
    try {
      const photo = await CapCamera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 60,
        width: 800,
        correctOrientation: true,
      });

      const compressedDataUrl = photo.dataUrl;
      
      if (!compressedDataUrl) {
        toast.error('Failed to capture photo');
        return;
      }

      setFormData(prev => ({ ...prev, receiptImage: compressedDataUrl }));
      // Extract receipt information using OCR (with error handling)
      setIsProcessingOCR(true);
      toast.info('📸 Receipt captured! Extracting information...', { duration: 2000 });

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-receipt-info`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ imageData: compressedDataUrl }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to extract receipt info');
        }

        const extractedData = await response.json();
        console.log('Extracted data:', extractedData);

        let fieldsUpdated = [];
        
        if (extractedData.storeName) {
          setFormData(prev => ({ ...prev, storeName: extractedData.storeName }));
          fieldsUpdated.push('store');
        }
        if (extractedData.amount) {
          setFormData(prev => ({ ...prev, price: extractedData.amount.toString() }));
          fieldsUpdated.push('price');
        }
        if (extractedData.purchaseDate) {
          try {
            const [month, day, year] = extractedData.purchaseDate.split('/');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            if (!isNaN(date.getTime())) {
              setPurchaseDate(date);
              fieldsUpdated.push('purchase date');
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
              fieldsUpdated.push('return by date');
            }
          } catch (err) {
            console.error('Error parsing return by date:', err);
          }
        }
        
        if (fieldsUpdated.length > 0) {
          toast.success(
            `✅ Extracted: ${fieldsUpdated.join(', ')}. Please review and click 'Add Return' to save.`,
            { duration: 6000 }
          );
        } else {
          toast.warning('Could not extract data. Please fill the form manually.', { duration: 4000 });
        }
      } catch (error) {
        console.error('OCR Error:', error);
        
        if (error instanceof Error && error.name === 'AbortError') {
          toast.warning('⏱️ OCR timeout. Please fill manually.', { duration: 4000 });
        } else {
          toast.warning('⚠️ Could not extract data. Please fill manually.', { duration: 4000 });
        }
      } finally {
        setIsProcessingOCR(false);
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Failed to capture photo. Please try again.');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Only allow opening via trigger button
    // Closing is handled explicitly via Cancel/Submit buttons
    if (newOpen) {
      setOpen(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-md">
          <Plus className="w-4 h-4 mr-2" />
          Add Return
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => {
        // Always prevent closing via clicking outside to fix Android issues
        e.preventDefault();
      }} onEscapeKeyDown={(e) => {
        // Always prevent closing via Escape key to fix Android issues
        e.preventDefault();
      }}>
        <DialogHeader>
          <DialogTitle>Add New Return</DialogTitle>
        </DialogHeader>
        <form id="add-return-form" onSubmit={handleSubmit} className="space-y-4">
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
                    if (!purchaseDate) return false;
                    const checkDate = new Date(date);
                    const checkPurchase = new Date(purchaseDate);
                    checkDate.setHours(0, 0, 0, 0);
                    checkPurchase.setHours(0, 0, 0, 0);
                    return checkDate.getTime() < checkPurchase.getTime();
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
            <Label>Receipt Image (Optional)</Label>
            <Button
              type="button"
              variant="outline"
              onClick={handleTakePhoto}
              disabled={isProcessingOCR}
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" />
              {isProcessingOCR ? 'Processing...' : formData.receiptImage ? 'Retake Photo' : 'Take Photo'}
            </Button>
            {formData.receiptImage && !isProcessingOCR && (
              <div className="mt-2">
                <img
                  src={formData.receiptImage}
                  alt="Receipt preview"
                  className="max-w-full h-auto rounded-md border"
                />
              </div>
            )}
            {isProcessingOCR && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
                <span>Analyzing receipt...</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-primary hover:opacity-90">
              Add Return
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
