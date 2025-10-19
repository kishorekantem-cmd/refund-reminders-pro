export interface ReturnItem {
  id: string;
  user_id: string;
  store_name: string;
  item_name: string;
  amount: number;
  purchase_date: string;
  return_date: string;
  receipt_image?: string;
  refund_received: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}