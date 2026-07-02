-- ============================================================
-- Supabase Storage — avatars bucket policy
-- ============================================================

-- Create the avatars bucket (run once)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Users can upload their own avatars
CREATE POLICY "Users can upload own avatars"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Anyone can view avatars (since it is public)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'avatars'
);

-- Users can delete/update their own avatars
CREATE POLICY "Users can manage own avatars"
ON storage.objects FOR ALL
USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
);
