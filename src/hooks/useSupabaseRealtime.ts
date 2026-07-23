/**
 * useSupabaseRealtime — lightweight Supabase Realtime subscription manager.
 *
 * Uses the @supabase/supabase-js client directly on the frontend with the
 * public anon key (safe to expose — RLS policies protect data on Supabase).
 *
 * Subscribes to postgres_changes on the given table and calls `onchange`
 * whenever any INSERT / UPDATE / DELETE occurs, letting the caller decide
 * how to refresh its own data.
 */

import { useEffect, useRef, useState } from 'react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// ── Hardcoded credentials (public anon key — safe for browser) ───────────────
const SUPABASE_URL = 'https://xzkxqatkhxeclmuzfhmc.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6a3hxYXRraHhlY2xtdXpmaG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0OTEyNDYsImV4cCI6MjEwMDA2NzI0Nn0.vhdZSSbgw-KGm3vaa27jEPXSDbc2al838rAGyqpm32k';

// Singleton client — one connection shared across all subscribers
let _supabase: SupabaseClient | null = null;
function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return _supabase;
}

export type RealtimeStatus = 'connecting' | 'connected' | 'error' | 'disconnected';

interface UseSupabaseRealtimeOptions {
  /** Supabase table name to watch */
  table: string;
  /** Schema, defaults to "public" */
  schema?: string;
  /** Called on any INSERT / UPDATE / DELETE on the table */
  onChange: () => void;
}

/**
 * Subscribes to Postgres changes on a table and exposes the connection status.
 * Automatically cleans up the channel on unmount.
 */
export function useSupabaseRealtime({
  table,
  schema = 'public',
  onChange,
}: UseSupabaseRealtimeOptions): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep the callback ref current without re-subscribing
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const supabase = getSupabaseClient();
    const channelName = `realtime-${schema}-${table}-${Math.random().toString(36).slice(2)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        { event: '*', schema, table },
        () => {
          onChangeRef.current();
        }
      )
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          setStatus('connected');
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          setStatus('error');
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setStatus('disconnected');
    };
  }, [table, schema]);

  return status;
}
