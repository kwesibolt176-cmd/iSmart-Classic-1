-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own customers"
ON public.customers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own customers"
ON public.customers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers"
ON public.customers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers"
ON public.customers FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create staff profiles table
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  employee_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  hourly_rate NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own staff"
ON public.staff FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert staff"
ON public.staff FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update staff"
ON public.staff FOR UPDATE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete staff"
ON public.staff FOR DELETE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_staff_updated_at
BEFORE UPDATE ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create time entries table for staff time tracking
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clock_out TIMESTAMP WITH TIME ZONE,
  break_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their time entries"
ON public.time_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create time entries"
ON public.time_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update time entries"
ON public.time_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete time entries"
ON public.time_entries FOR DELETE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_time_entries_updated_at
BEFORE UPDATE ON public.time_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create restaurant tables table
CREATE TABLE public.restaurant_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  table_number INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  current_order_id UUID,
  section TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, table_number)
);

ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tables"
ON public.restaurant_tables FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create tables"
ON public.restaurant_tables FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update tables"
ON public.restaurant_tables FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete tables"
ON public.restaurant_tables FOR DELETE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_restaurant_tables_updated_at
BEFORE UPDATE ON public.restaurant_tables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create reservations table
CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  party_size INTEGER NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their reservations"
ON public.reservations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create reservations"
ON public.reservations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update reservations"
ON public.reservations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete reservations"
ON public.reservations FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_reservations_updated_at
BEFORE UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their expenses"
ON public.expenses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert expenses"
ON public.expenses FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update expenses"
ON public.expenses FOR UPDATE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete expenses"
ON public.expenses FOR DELETE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create transactions table for payment tracking
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  transaction_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their transactions"
ON public.transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update transactions"
ON public.transactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete transactions"
ON public.transactions FOR DELETE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'));

-- Create waitlist table
CREATE TABLE public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  party_size INTEGER NOT NULL,
  estimated_wait_time INTEGER,
  status TEXT NOT NULL DEFAULT 'waiting',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their waitlist"
ON public.waitlist FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create waitlist entries"
ON public.waitlist FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update waitlist entries"
ON public.waitlist FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete waitlist entries"
ON public.waitlist FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_waitlist_updated_at
BEFORE UPDATE ON public.waitlist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their chat messages"
ON public.chat_messages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create chat messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their chat messages"
ON public.chat_messages FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their chat messages"
ON public.chat_messages FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_customers_user_id ON public.customers(user_id);
CREATE INDEX idx_staff_user_id ON public.staff(user_id);
CREATE INDEX idx_time_entries_staff_id ON public.time_entries(staff_id);
CREATE INDEX idx_restaurant_tables_user_id ON public.restaurant_tables(user_id);
CREATE INDEX idx_reservations_user_id ON public.reservations(user_id);
CREATE INDEX idx_reservations_date ON public.reservations(reservation_date);
CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_order_id ON public.transactions(order_id);
CREATE INDEX idx_waitlist_user_id ON public.waitlist(user_id);
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);