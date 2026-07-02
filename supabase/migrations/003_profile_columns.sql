-- ============================================================
-- Nekofi Database Schema — Profile Columns Migration
-- ============================================================

-- Add username, phone, and bio columns to profiles table if they don't already exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
