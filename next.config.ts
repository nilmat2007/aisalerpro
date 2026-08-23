import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://guhdweujxgsbflkvgryb.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aGR3ZXVqeGdzYmZsa3ZncnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NzEzMTEsImV4cCI6MjA3MjQ0NzMxMX0.ZmAnnw1GUpn7Vgh1GAhqE-8ngCAqP7b_XqABminDLhk",
    JWT_SECRET: process.env.JWT_SECRET || "pheem-ai-toolkit-secret-key-2026-super-secure",
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
