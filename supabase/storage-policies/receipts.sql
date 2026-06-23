-- ============================================================
-- Supabase Storage — receipts bucket policy
-- ============================================================

-- Create the receipts bucket (run once)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Users can upload their own receipts
CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can read their own receipts
CREATE POLICY "Users can read own receipts"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own receipts
CREATE POLICY "Users can delete own receipts"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
);
