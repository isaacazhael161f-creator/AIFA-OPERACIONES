-- Update permissions for wildlife tables to include 'admin' role
-- Authorized roles: 'control_fauna', 'superadmin', 'admin'

-- 1. Wildlife Strikes
ALTER TABLE public.wildlife_strikes ENABLE ROW LEVEL SECURITY;

-- Drop previous policies to avoid conflicts
DROP POLICY IF EXISTS "Enable insert for authorized roles" ON public.wildlife_strikes;
DROP POLICY IF EXISTS "Enable update for authorized roles" ON public.wildlife_strikes;
DROP POLICY IF EXISTS "Enable delete for authorized roles" ON public.wildlife_strikes;

CREATE POLICY "Enable insert for authorized roles" ON public.wildlife_strikes FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('control_fauna', 'superadmin', 'admin')
  )
);

CREATE POLICY "Enable update for authorized roles" ON public.wildlife_strikes FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('control_fauna', 'superadmin', 'admin')
  )
);

CREATE POLICY "Enable delete for authorized roles" ON public.wildlife_strikes FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('control_fauna', 'superadmin', 'admin')
  )
);

-- 2. Rescued Wildlife
ALTER TABLE public.rescued_wildlife ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for authorized roles" ON public.rescued_wildlife;
DROP POLICY IF EXISTS "Enable update for authorized roles" ON public.rescued_wildlife;
DROP POLICY IF EXISTS "Enable delete for authorized roles" ON public.rescued_wildlife;

CREATE POLICY "Enable insert for authorized roles" ON public.rescued_wildlife FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('control_fauna', 'superadmin', 'admin')
  )
);

CREATE POLICY "Enable update for authorized roles" ON public.rescued_wildlife FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('control_fauna', 'superadmin', 'admin')
  )
);

CREATE POLICY "Enable delete for authorized roles" ON public.rescued_wildlife FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('control_fauna', 'superadmin', 'admin')
  )
);
