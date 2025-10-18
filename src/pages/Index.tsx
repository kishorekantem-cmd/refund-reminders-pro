import { useState } from "react";
import { ReturnCard, ReturnItem } from "@/components/ReturnCard";
import { AddReturnDialog } from "@/components/AddReturnDialog";
import { ReturnDetailDialog } from "@/components/ReturnDetailDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Receipt } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [returns, setReturns] = useState<ReturnItem[]>([
    {
      id: "1",
      storeName: "Amazon",
      purchaseDate: new Date(2025, 0, 15),
      returnDate: new Date(2025, 1, 15),
      price: 89.99,
      status: "pending",
      refundReceived: false,
    },
    {
      id: "2",
      storeName: "Target",
      purchaseDate: new Date(2024, 11, 20),
      returnDate: new Date(2025, 0, 20),
      price: 45.50,
      status: "completed",
      refundReceived: true,
    },
  ]);
  const [selectedReturn, setSelectedReturn] = useState<ReturnItem | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  const handleAddReturn = (newReturn: Omit<ReturnItem, "id">) => {
    const returnWithId = {
      ...newReturn,
      id: Date.now().toString(),
    };
    setReturns([returnWithId, ...returns]);
  };

  const handleToggleRefund = (id: string) => {
    setReturns(
      returns.map((item) =>
        item.id === id ? { ...item, refundReceived: !item.refundReceived } : item
      )
    );
    toast.success("Refund status updated");
  };

  const handleMarkComplete = (id: string) => {
    setReturns(
      returns.map((item) =>
        item.id === id ? { ...item, status: "completed" as const } : item
      )
    );
    setSelectedReturn(null);
    toast.success("Return marked as complete!");
  };

  const handleDelete = (id: string) => {
    setReturns(returns.filter((item) => item.id !== id));
    setSelectedReturn(null);
    toast.success("Return deleted");
  };

  const filteredReturns = returns.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  const totalPending = returns.filter((r) => r.status === "pending").length;
  const totalAmount = returns
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.price, 0);

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
                <h1 className="text-2xl font-bold">ReturnTrackr</h1>
                <p className="text-sm text-primary-foreground/80">Track your returns effortlessly</p>
              </div>
            </div>
            <AddReturnDialog onAdd={handleAddReturn} />
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
                onClick={() => setSelectedReturn(item)}
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
        onDelete={handleDelete}
      />
    </div>
  );
};

export default Index;
