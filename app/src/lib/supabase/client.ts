"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./config";

export function createSupabaseBrowserClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) return null;
  return createSupabaseBrowserClient();
}
