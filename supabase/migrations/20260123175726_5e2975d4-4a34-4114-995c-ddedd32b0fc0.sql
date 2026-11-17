-- Create table for end-of-day checklists
CREATE TABLE public.end_of_day_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  location_id UUID REFERENCES public.locations(id),
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Cash reconciliation
  expected_cash NUMERIC(12,2) DEFAULT 0,
  actual_cash NUMERIC(12,2),
  cash_difference NUMERIC(12,2),
  
  -- Checklist items (stored as JSONB for flexibility)
  checklist_items JSONB DEFAULT '[]'::jsonb,
  
  -- Shift handover notes
  handover_notes TEXT,
  issues_reported TEXT,
  next_shift_tasks TEXT,
  
  -- Staff info
  completed_by_staff_id UUID REFERENCES public.staff(id),
  completed_by_name TEXT,
  
  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'reviewed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.end_of_day_checklists ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own checklists"
ON public.end_of_day_checklists
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own checklists"
ON public.end_of_day_checklists
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checklists"
ON public.end_of_day_checklists
FOR UPDATE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_end_of_day_checklists_updated_at
BEFORE UPDATE ON public.end_of_day_checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();