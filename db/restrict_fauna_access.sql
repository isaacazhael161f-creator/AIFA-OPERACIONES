-- Restrict write access to 'control_fauna' and 'superadmin' for wildlife tables

-- Wildlife Strikes
ALTER TABLE public.wildlife_strikes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.wildlife_strikes;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.wildlife_strikes;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.wildlife_strikes;

CREATE POLICY "Enable insert for authorized roles" ON public.wildlife_strikes FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('control_fauna', 'superadmin')
  )
);

CREATE POLICY "Enable update for authorized roles" ON public.wildlife_strikes FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('control_fauna', 'superadmin')
  )
);

CREATE POLICY "Enable delete for authorized roles" ON public.wildlife_strikes FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('control_fauna', 'superadmin')
  )
);

-- Rescued Wildlife
ALTER TABLE public.rescued_wildlife ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.rescued_wildlife;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.rescued_wildlife;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.rescued_wildlife;

CREATE POLICY "Enable insert for authorized roles" ON public.rescued_wildlife FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('control_fauna', 'superadmin')
  )
);

CREATE POLICY "Enable update for authorized roles" ON public.rescued_wildlife FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('control_fauna', 'superadmin')
  )
);

CREATE POLICY "Enable delete for authorized roles" ON public.rescued_wildlife FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('control_fauna', 'superadmin')
  )
);

-- Ensure user_roles is readable by authenticated users so the trigger/check works
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_roles;
CREATE POLICY "Enable read access for all users" ON public.user_roles FOR SELECT USING (true);
