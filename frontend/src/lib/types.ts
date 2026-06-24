export interface ChatMessage {
  id: string;
  type: "user" | "agent" | "system";
  content: string;
  timestamp: Date;
}

export interface Session {
  session_id: string;
  started_at: string;
  ended_at?: string;
  status: "active" | "completed";
  customer_name?: string;
  order_number?: string;
}

export interface ReasoningLogEntry {
  session_id: string;
  timestamp: string;
  step_type:
    | "llm_call"
    | "tool_call"
    | "tool_result"
    | "agent_response"
    | "user_message"
    | "error"
    | "decision";
  tool_name?: string;
  input?: Record<string, unknown>;
  output?: unknown;
  message?: string;
  reasoning?: string;
  decision?: string;
  policy_sections?: number[];
}

export interface AdminWSMessage {
  type:
    | "init"
    | "session_created"
    | "session_updated"
    | "session_ended"
    | "reasoning_log"
    | "ping";
  sessions?: Session[];
  session?: Session;
  entry?: ReasoningLogEntry;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  account_status: string;
  notes: string | null;
  created_at: string;
  orders?: Order[];
  refunds?: Refund[];
}

export interface Order {
  order_number: string;
  product_name: string;
  product_category: string;
  price: number;
  status: string;
  order_date: string;
  delivery_date: string | null;
  is_digital: boolean;
  is_final_sale: boolean;
  is_clearance: boolean;
  is_personalized: boolean;
}

export interface Refund {
  refund_number: string;
  reason: string;
  status: string;
  amount: number | null;
  policy_sections_cited: string | null;
  denial_reasons: string | null;
  created_at: string;
}
