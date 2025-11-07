import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ReturnCard, ReturnItem } from "@/components/ReturnCard";
import { AddReturnDialog } from "@/components/AddReturnDialog";
import { EditReturnDialog } from "@/components/EditReturnDialog";
import { ReturnDetailDialog } from "@/components/ReturnDetailDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Receipt, Settings as SettingsIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { ReturnItem as DBReturnItem } from "@/types/database";
import { requestNotificationPermission, checkAndScheduleNotifications } from "@/utils/notifications";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<ReturnItem | null>(null);
  const [editingReturn, setEditingReturn] = useState<ReturnItem | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [fetchLoading, setFetchLoading] = useState(true);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchReturns();
      initializeNotifications();
    }
  }, [user]);

  const initializeNotifications = async () => {
    const hasPermission = await requestNotificationPermission();
    if (hasPermission) {
      await checkAndScheduleNotifications();
    }
  };

  // Pull to refresh handlers
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        setPullStartY(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (pullStartY !== null && window.scrollY === 0) {
        const touchY = e.touches[0].clientY;
        const pullDistance = touchY - pullStartY;
        
        if (pullDistance > 80 && !isRefreshing) {
          handleRefresh();
          setPullStartY(null);
        }
      }
    };

    const handleTouchEnd = () => {
      setPullStartY(null);
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullStartY, isRefreshing]);


  const fetchReturns = async () => {
    if (!user) {
      console.log('No user found, skipping fetch');
      return;
    }

    console.log('Starting fetchReturns...');
    setFetchLoading(true);
    
    try {
      console.log('Fetching returns data...');
      // Exclude receipt_image from initial fetch to prevent timeout on large base64 images
      const { data, error } = await supabase
        .from('returns')
        .select('id, user_id, store_name, item_name, amount, purchase_date, return_date, returned_date, refund_received, notes, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Database error:', error);
        toast.error('Failed to load returns: ' + error.message);
        setFetchLoading(false);
        return;
      }

      console.log('Returns data fetched:', data?.length, 'items');

      // Check which returns have receipts (lightweight query - only fetch IDs)
      console.log('Checking for receipts...');
      const { data: receiptsData, error: receiptsError } = await supabase
        .from('returns')
        .select('id')
        .not('receipt_image', 'is', null)
        .limit(100);

      if (receiptsError) {
        console.error('Receipts check error:', receiptsError);
        // Continue without receipt info rather than failing
      }

      console.log('Receipts check complete:', receiptsData?.length, 'items with receipts');
      const receiptsMap = new Set(receiptsData?.map(r => r.id) || []);


      console.log('Transforming returns data...');
      const transformedReturns: ReturnItem[] = (data as DBReturnItem[]).map(item => ({
        id: item.id,
        storeName: item.store_name,
        purchaseDate: item.purchase_date ? new Date(item.purchase_date) : null,
        returnDate: item.return_date ? new Date(item.return_date) : null,
        returnedDate: item.returned_date ? new Date(item.returned_date) : null,
        price: Number(item.amount),
        receiptImage: null, // Will be loaded on demand when viewing details
        hasReceipt: receiptsMap.has(item.id),
        status: item.refund_received ? "completed" : "pending",
        refundReceived: item.refund_received,
      }));
      console.log('Setting returns state with', transformedReturns.length, 'items');
      setReturns(transformedReturns);
      console.log('Returns state updated');
    } catch (error) {
      console.error('Fetch exception:', error);
      toast.error('Failed to load returns');
    } finally {
      console.log('Setting fetchLoading to false');
      setFetchLoading(false);
    }
  };

  const loadReceiptImage = async (returnId: string) => {
    setLoadingReceipt(true);
    try {
      const { data, error } = await supabase
        .from('returns')
        .select('receipt_image')
        .eq('id', returnId)
        .single();

      if (error) {
        console.error('Failed to load receipt image:', error);
      } else if (data?.receipt_image) {
        setSelectedReturn(prev => prev ? { ...prev, receiptImage: data.receipt_image } : null);
      }
    } catch (error) {
      console.error('Error loading receipt:', error);
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchReturns();
      await checkAndScheduleNotifications();
      toast.success("Refreshed!", { duration: 2000 });
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error("Failed to refresh");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddReturn = async (newReturn: Omit<ReturnItem, "id">) => {
    if (!user) return;

    try {
      // Validate image size (max 2MB for better mobile compatibility)
      if (newReturn.receiptImage && newReturn.receiptImage.length > 2 * 1024 * 1024) {
        toast.error('Image is too large. Please use a smaller image (max 2MB)');
        return;
      }

      const { data, error } = await supabase
        .from('returns')
        .insert({
          user_id: user.id,
          store_name: newReturn.storeName,
          item_name: newReturn.storeName,
          amount: newReturn.price,
          purchase_date: newReturn.purchaseDate.toISOString().split('T')[0],
          return_date: newReturn.returnDate ? newReturn.returnDate.toISOString().split('T')[0] : null,
          returned_date: newReturn.returnedDate ? newReturn.returnedDate.toISOString().split('T')[0] : null,
          receipt_image: newReturn.receiptImage,
          refund_received: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding return:', error);
        toast.error('Failed to add return: ' + error.message);
        return;
      }

      if (data) {
        const newItem: ReturnItem = {
          id: data.id,
          storeName: data.store_name,
          purchaseDate: data.purchase_date ? new Date(data.purchase_date) : null,
          returnDate: data.return_date ? new Date(data.return_date) : null,
          returnedDate: data.returned_date ? new Date(data.returned_date) : null,
          price: Number(data.amount),
          receiptImage: data.receipt_image,
          hasReceipt: !!data.receipt_image,
          status: "pending",
          refundReceived: false,
        };
        setReturns([newItem, ...returns]);
        toast.success('Return added successfully!', { duration: 3000 });
      }
    } catch (err) {
      console.error('Exception adding return:', err);
      toast.error('Failed to add return. Please try again.');
    }
  };

  const handleToggleRefund = async (id: string) => {
    const returnItem = returns.find(r => r.id === id);
    if (!returnItem) return;

    const newRefundStatus = !returnItem.refundReceived;
    const { error } = await supabase
      .from('returns')
      .update({ refund_received: newRefundStatus })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update refund status');
    } else {
      setReturns(returns.map(r => 
        r.id === id 
          ? { ...r, refundReceived: newRefundStatus, status: newRefundStatus ? "completed" : "pending" }
          : r
      ));
      toast.success("Refund status updated");
    }
  };

  const handleMarkComplete = async (id: string) => {
    const { error } = await supabase
      .from('returns')
      .update({ refund_received: true })
      .eq('id', id);

    if (error) {
      toast.error('Failed to mark as complete');
    } else {
      setReturns(returns.map(r => 
        r.id === id 
          ? { ...r, refundReceived: true, status: "completed" }
          : r
      ));
      setSelectedReturn(null);
      toast.success("Return marked as complete!");
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('returns')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete return');
    } else {
      setReturns(returns.filter(r => r.id !== id));
      setSelectedReturn(null);
      toast.success("Return deleted");
    }
  };

  const handleMarkReturned = async (id: string, date: Date) => {
    const { error } = await supabase
      .from('returns')
      .update({ returned_date: date.toISOString().split('T')[0] })
      .eq('id', id);

    if (error) {
      toast.error('Failed to mark as returned');
    } else {
      const updatedReturns = returns.map(r => 
        r.id === id 
          ? { ...r, returnedDate: date }
          : r
      );
      setReturns(updatedReturns);
      
      // Update selectedReturn if it's the item being updated
      if (selectedReturn && selectedReturn.id === id) {
        setSelectedReturn({ ...selectedReturn, returnedDate: date });
      }
      
      toast.success("Marked as returned!");
    }
  };

  const handleEdit = async (id: string, data: Partial<ReturnItem>) => {
    const { error } = await supabase
      .from('returns')
      .update({
        store_name: data.storeName,
        amount: data.price,
        purchase_date: data.purchaseDate ? data.purchaseDate.toISOString().split('T')[0] : null,
        return_date: data.returnDate ? data.returnDate.toISOString().split('T')[0] : null,
        returned_date: data.returnedDate ? data.returnedDate.toISOString().split('T')[0] : null,
        receipt_image: data.receiptImage,
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update return');
    } else {
      setReturns(returns.map(r => 
        r.id === id 
          ? { ...r, ...data }
          : r
      ));
      setEditingReturn(null);
      toast.success("Return updated successfully!");
    }
  };


  const filteredReturns = returns.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  const totalPending = returns.filter((r) => r.status === "pending").length;
  const totalAmount = returns
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.price, 0);

  // Redirect if no user (after all hooks have been called)
  if (!loading && !user) {
    console.log('No user detected, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }
  
  console.log('Current user:', user?.email, 'loading:', loading);

  if (loading || fetchLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Receipt className="w-16 h-16 mx-auto text-primary mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading your returns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gradient-primary text-primary-foreground shadow-lg">
        <div className="container max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">ReFundly</h1>
                <p className="text-sm text-primary-foreground/80">Track your returns effortlessly</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AddReturnDialog onAdd={handleAddReturn} />
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-white/10 h-10 w-10 text-primary-foreground touch-manipulation"
                aria-label="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/settings")}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-white/10 h-10 w-10 text-primary-foreground touch-manipulation"
                aria-label="Settings"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="container max-w-2xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-gradient-card shadow-card border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-warning" />
              <span className="text-sm text-muted-foreground">Pending Returns</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{totalPending}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-card shadow-card border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-5 h-5 text-accent" />
              <span className="text-sm text-muted-foreground">Total Value</span>
            </div>
            <p className="text-3xl font-bold text-accent">${totalAmount.toFixed(2)}</p>
          </div>
        </div>

        {/* Filters */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Returns List */}
        <div className="space-y-4 pb-8">
          {filteredReturns.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No returns found</h3>
              <p className="text-muted-foreground mb-6">
                {filter === "all"
                  ? "Add your first return to get started"
                  : `No ${filter} returns`}
              </p>
              {filter === "all" && (
                <AddReturnDialog onAdd={handleAddReturn} />
              )}
            </div>
          ) : (
            filteredReturns.map((item) => (
              <ReturnCard
                key={item.id}
                item={item}
                onClick={() => {
                  setSelectedReturn(item);
                  if (item.hasReceipt) {
                    loadReceiptImage(item.id);
                  }
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <ReturnDetailDialog
        item={selectedReturn}
        open={!!selectedReturn}
        onOpenChange={(open) => !open && setSelectedReturn(null)}
        onToggleRefund={handleToggleRefund}
        onMarkComplete={handleMarkComplete}
        onMarkReturned={handleMarkReturned}
        onEdit={setEditingReturn}
        onDelete={handleDelete}
      />

      {/* Edit Dialog */}
      <EditReturnDialog
        item={editingReturn}
        open={!!editingReturn}
        onOpenChange={(open) => !open && setEditingReturn(null)}
        onSave={handleEdit}
      />
    </div>
  );
};

export default Index;
