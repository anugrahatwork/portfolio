-- 1. User Roles Table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    role TEXT CHECK (role IN ('root', 'user')) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own role
CREATE POLICY "Users can view their own role" 
ON user_roles FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Future-proofing: Automatic 'user' role on registration
-- (Optional: uncomment if you want everyone to get 'user' by default)
/*
CREATE OR REPLACE FUNCTION public.handle_new_user_role() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_role();
*/
