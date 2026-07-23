import { useState, useEffect, useCallback } from 'react';
import { Voucher, VoucherStatus, ExtractedVoucher } from '../types';
import { useToast } from '../components/Toast';
import { useSupabaseRealtime } from './useSupabaseRealtime';

export function useVouchers() {
  const { addToast } = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [importLogs, setImportLogs] = useState<{id: string, filename: string, count: number, date: string, actionType?: string, details?: string}[]>([]);
  const [stats, setStats] = useState({ total: 0, available: 0, used: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/vouchers/stats');
      if (!res.ok) {
        console.error('Stats fetch failed with status:', res.status);
        return;
      }
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error('Expected JSON stats but got:', contentType);
        return;
      }

      const data = await res.json();
      
      if (data.error) {
        console.error('Server reported error:', data.error);
        return;
      }

      setStats({
        available: data.available ?? 0,
        used: data.used ?? 0,
        total: (data.available ?? 0) + (data.used ?? 0)
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchVouchers = useCallback(async () => {
    try {
      const res = await fetch('/api/vouchers');
      if (!res.ok) {
        console.error('Vouchers fetch failed with status:', res.status);
        return;
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error('Expected JSON vouchers but got:', contentType);
        return;
      }

      const data = await res.json();
      
      if (data.vouchers) {
        setVouchers(data.vouchers.map((v: any) => ({
          id: v.id.toString(),
          code: v.code,
          duration: v.duration,
          price: v.price || '',
          status: (v.status === 'redeemed' ? 'used' : v.status) as VoucherStatus,
          createdAt: v.created_at,
          usedAt: v.redeemed_at,
          source: 'Supabase'
        })));
      }
    } catch (err) {
      console.error('Failed to fetch vouchers:', err);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/logs');
      if (!res.ok) {
        console.error('Logs fetch failed with status:', res.status);
        return;
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error('Expected JSON logs but got:', contentType);
        return;
      }

      const data = await res.json();
      if (data.logs) {
        setImportLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchVouchers(), fetchLogs()]);
    setLoading(false);
  }, [fetchStats, fetchVouchers, fetchLogs]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Subscribe to realtime voucher changes
  useSupabaseRealtime({
    table: 'vouchers',
    onChange: () => {
      // Whenever a voucher is added, updated, or deleted by another client,
      // we refresh our data automatically.
      refreshAll();
    }
  });

  // Helper function to dispatch logs to database and state
  const addLog = async (filename: string, count: number, actionType: string, details: string) => {
    const logItem = {
      id: crypto.randomUUID(),
      filename,
      count,
      date: new Date().toISOString(),
      actionType,
      details
    };

    // Optimistically update frontend state for UI snapiness
    setImportLogs(prev => [logItem, ...prev]);

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logItem)
      });
    } catch (err) {
      console.error('Failed to write audit log to database:', err);
    }
  };

  const addVouchers = async (extracted: ExtractedVoucher[], source: string) => {
    try {
      const res = await fetch('/api/vouchers/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vouchers: extracted })
      });
      const data = await res.json();
      
      if (data.success) {
        const isManual = source === "Manual Input";
        const detailsText = isManual 
          ? `Added manual voucher code: ${extracted[0]?.code || ""} (${extracted[0]?.duration || ""})`
          : `Imported ${data.count} vouchers from ${source}`;

        await addLog(
          isManual ? "Voucher Added" : "Vouchers Imported",
          data.count,
          isManual ? "manual_add" : "import",
          detailsText
        );

        await Promise.all([fetchStats(), fetchVouchers()]);
        addToast(`Successfully imported ${data.count} vouchers from ${source}`, "success");
      } else {
        addToast(data.error || "Failed to save vouchers to database", "error");
      }
    } catch (err: any) {
      console.error('Failed to save vouchers:', err);
      addToast(err.message || "Failed to connect to server to save vouchers", "error");
    }
  };

  const updateVoucherStatus = async (id: string, status: VoucherStatus) => {
    try {
      const res = await fetch(`/api/vouchers/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const voucher = vouchers.find(v => v.id === id);
        const code = voucher ? voucher.code : 'Unknown';
        const duration = voucher ? voucher.duration : '';
        
        await addLog(
          "Status Updated",
          0,
          "status_update",
          `Changed voucher ${code} (${duration}) status to ${status}`
        );

        await Promise.all([fetchStats(), fetchVouchers()]);
      }
    } catch (err) {
      console.error('Failed to update voucher status:', err);
    }
  };

  const deleteVoucher = async (id: string): Promise<boolean> => {
    try {
      const voucher = vouchers.find(v => v.id === id);
      const code = voucher ? voucher.code : 'Unknown';
      const duration = voucher ? voucher.duration : '';
      
      const res = await fetch(`/api/vouchers/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await addLog(
          "Voucher Deleted",
          -1,
          "delete",
          `Deleted voucher ${code} (${duration})`
        );

        await Promise.all([fetchStats(), fetchVouchers()]);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete voucher:', err);
      return false;
    }
  };

  const clearAll = async (): Promise<boolean> => {
    try {
      const totalCleared = vouchers.length;
      const res = await fetch('/api/vouchers/clear', { method: 'POST' });
      if (res.ok) {
        await addLog(
          "Database Cleared",
          -totalCleared,
          "clear",
          `Cleared all ${totalCleared} voucher records from database`
        );

        await Promise.all([fetchStats(), fetchVouchers()]);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to clear vouchers:', err);
      return false;
    }
  };

  const getAndUseVoucher = async (duration: string, turnstileToken: string): Promise<Voucher | null> => {
    try {
      const res = await fetch('/api/vouchers/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationId: duration, turnstileToken })
      });
      
      if (!res.ok) {
        let errorMessage = `Error ${res.status}`;
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
          }
        } catch (e) {
          console.error('Failed to parse error JSON');
        }
        console.error('Redemption error:', errorMessage);
        throw new Error(errorMessage);
      }

      const data = await res.json();
      
      await addLog(
        "Voucher Redeemed",
        -1,
        "redeem",
        `Redeemed ${data.duration || duration} voucher code: ${data.code}`
      );

      await Promise.all([fetchStats(), fetchVouchers()]);
      
      return {
        id: Math.random().toString(),
        code: data.code,
        duration: data.duration,
        price: '',
        status: 'used',
        createdAt: new Date().toISOString(),
        source: 'Supabase'
      };
    } catch (err: any) {
      console.error('Failed to redeem voucher:', err);
      throw err;
    }
  };

  const addSingleVoucher = async (code: string, duration: string, price: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/vouchers/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, duration, price })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add voucher');
      await addLog('Voucher Added', 1, 'manual_add', `Manually added voucher code: ${code} (${duration})`);
      await Promise.all([fetchStats(), fetchVouchers()]);
      addToast(`Voucher "${code}" added successfully`, 'success');
      return true;
    } catch (err: any) {
      addToast(err.message || 'Failed to add voucher', 'error');
      return false;
    }
  };

  const editVoucher = async (id: string, code: string, duration: string, price: string, status: VoucherStatus): Promise<boolean> => {
    try {
      const res = await fetch(`/api/vouchers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, duration, price, status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to edit voucher');
      await addLog('Voucher Edited', 0, 'edit', `Edited voucher ${code} (${duration})`);
      await Promise.all([fetchStats(), fetchVouchers()]);
      addToast(`Voucher "${code}" updated successfully`, 'success');
      return true;
    } catch (err: any) {
      addToast(err.message || 'Failed to edit voucher', 'error');
      return false;
    }
  };

  return {
    vouchers,
    importLogs,
    addVouchers,
    addSingleVoucher,
    editVoucher,
    updateVoucherStatus,
    getAndUseVoucher,
    deleteVoucher,
    clearAll,
    stats,
    loading,
    refresh: refreshAll
  };
}
