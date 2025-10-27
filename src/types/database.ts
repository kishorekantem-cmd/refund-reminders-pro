export interface ReturnItem {
  id: string;
  user_id: string;
  store_name: string;
  item_name: string;
  amount: number;
  purchase_date: string;
  return_date: string;
  returned_date: string | null;
  receipt_image: string | null;
  has_receipt: boolean;
  refund_received: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
