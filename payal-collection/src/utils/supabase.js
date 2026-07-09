// src/utils/supabase.js
// Importing Supabase directly via a fast global CDN link (no installation required)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Replace the text inside these quotes with your actual credentials from your Supabase Dashboard
const SUPABASE_URL = 'https://wmwuzomaxuljvcynrtad.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtd3V6b21heHVsanZjeW5ydGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NjE1MjUsImV4cCI6MjA5OTAzNzUyNX0.haXXVSPzxIpGKeIV4JJ9YSJxzZcKxP7FLGy9Nq39P0w'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)