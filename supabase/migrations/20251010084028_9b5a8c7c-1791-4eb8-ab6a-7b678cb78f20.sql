-- Create subcategories table
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subcategories
CREATE POLICY "Users can view their own subcategories"
ON public.subcategories
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subcategories"
ON public.subcategories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subcategories"
ON public.subcategories
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subcategories"
ON public.subcategories
FOR DELETE
USING (auth.uid() = user_id);

-- Add subcategory_id to inventory_items
ALTER TABLE public.inventory_items
ADD COLUMN subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL;

-- Add trigger for subcategories updated_at
CREATE TRIGGER update_subcategories_updated_at
BEFORE UPDATE ON public.subcategories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();