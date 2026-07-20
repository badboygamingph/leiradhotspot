import React, { useState, useMemo } from 'react';
import { 
  FileUp, 
  Plus, 
  Ticket, 
  Trash2, 
  RefreshCw, 
  Flame, 
  FileText, 
  Clock, 
  ShieldCheck, 
  Activity, 
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Eraser
} from 'lucide-react';

interface SystemLog {
  id: string;
  filename: string; // Event label
  count: number;    // Impact count
  date: string;     // ISO Timestamp
  actionType?: 'import' | 'manual_add' | 'delete' | 'status_update' | 'clear' | 'redeem' | string;
  details?: string; // Descriptive log explanation
}

interface Props {
  logs: SystemLog[];
}

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 25, 50];

export function ImportLogsTable({ logs }: Props) {
  // State variables for searching, filtering, and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Helper to render event icons and color palettes dynamically
  const getEventBadge = (log: SystemLog) => {
    const action = log.actionType || '';
    const title = log.filename || 'System Action';

    switch (action) {
      case 'import':
        return {
          icon: <FileUp className="w-3.5 h-3.5" />,
          bgColor: 'bg-blue-50 text-blue-700 border-blue-100',
          label: title
        };
      case 'manual_add':
        return {
          icon: <Plus className="w-3.5 h-3.5" />,
          bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          label: title
        };
      case 'redeem':
        return {
          icon: <Ticket className="w-3.5 h-3.5" />,
          bgColor: 'bg-purple-50 text-purple-700 border-purple-100',
          label: title
        };
      case 'delete':
        return {
          icon: <Trash2 className="w-3.5 h-3.5" />,
          bgColor: 'bg-rose-50 text-rose-700 border-rose-100',
          label: title
        };
      case 'status_update':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5" />,
          bgColor: 'bg-amber-50 text-amber-700 border-amber-100',
          label: title
        };
      case 'clear':
        return {
          icon: <Flame className="w-3.5 h-3.5" />,
          bgColor: 'bg-orange-50 text-orange-700 border-orange-100',
          label: title
        };
      default:
        if (title.toLowerCase().includes('clear') || title.toLowerCase().includes('cleared')) {
          return {
            icon: <Flame className="w-3.5 h-3.5" />,
            bgColor: 'bg-orange-50 text-orange-700 border-orange-100',
            label: title
          };
        }
        if (title.toLowerCase().includes('delete') || title.toLowerCase().includes('deleted')) {
          return {
            icon: <Trash2 className="w-3.5 h-3.5" />,
            bgColor: 'bg-rose-50 text-rose-700 border-rose-100',
            label: title
          };
        }
        if (title.toLowerCase().includes('redeem') || title.toLowerCase().includes('used')) {
          return {
            icon: <Ticket className="w-3.5 h-3.5" />,
            bgColor: 'bg-purple-50 text-purple-700 border-purple-100',
            label: title
          };
        }
        return {
          icon: <FileText className="w-3.5 h-3.5" />,
          bgColor: 'bg-slate-50 dark:bg-slate-800 text-slate-700 border-slate-100 dark:border-slate-800',
          label: title
        };
    }
  };

  // Filter types with human labels and colors
  const filterCategories = [
    { value: 'all', label: 'All Events', count: logs.length },
    { value: 'import', label: 'Imports', count: logs.filter(l => l.actionType === 'import').length },
    { value: 'manual_add', label: 'Manual Adds', count: logs.filter(l => l.actionType === 'manual_add').length },
    { value: 'redeem', label: 'Redemptions', count: logs.filter(l => l.actionType === 'redeem').length },
    { value: 'status_update', label: 'Updates', count: logs.filter(l => l.actionType === 'status_update').length },
    { value: 'delete', label: 'Deletions', count: logs.filter(l => l.actionType === 'delete').length },
    { value: 'clear', label: 'Clears', count: logs.filter(l => l.actionType === 'clear').length },
  ];

  // Apply filters and searches to find target logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Category check
      if (selectedAction !== 'all') {
        const type = log.actionType || '';
        // Fallback checks for missing actionTypes
        if (selectedAction === 'clear' && !type) {
          if (!log.filename.toLowerCase().includes('clear')) return false;
        } else if (selectedAction === 'delete' && !type) {
          if (!log.filename.toLowerCase().includes('delete')) return false;
        } else if (selectedAction === 'redeem' && !type) {
          if (!log.filename.toLowerCase().includes('redeem')) return false;
        } else if (type !== selectedAction) {
          return false;
        }
      }

      // Keyword text search check
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const detailsMatch = log.details?.toLowerCase().includes(query);
        const nameMatch = log.filename.toLowerCase().includes(query);
        const actionMatch = log.actionType?.toLowerCase().includes(query);
        return detailsMatch || nameMatch || actionMatch;
      }

      return true;
    });
  }, [logs, selectedAction, searchQuery]);

  // Compute pagination parameters
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedLogs = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredLogs, safeCurrentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedAction('all');
    setCurrentPage(1);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
      {/* Header and Summary stats bar */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Security & Action Audits</h2>
          </div>
          <h1 className="text-xl font-light text-slate-900 dark:text-white tracking-tight">System Event Logger</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A comprehensive, read-only record of all administrative, user, and batch transactions executed. <span className="text-rose-600 font-medium">Auto-deleted after 30 days.</span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-3 py-1.5 self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Integrity Guard Active
          </span>
        </div>
      </div>

      {/* Control Panel: Filters, Searches and Toggles */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search activity description, event names or type..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to page 1 on search
              }}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Settings / Extra controls line */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-slate-200 dark:border-slate-800 rounded-sm bg-white dark:bg-slate-900 py-1 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {ITEMS_PER_PAGE_OPTIONS.map((val) => (
                  <option key={val} value={val}>{val} rows</option>
                ))}
              </select>
            </div>

            {(searchQuery || selectedAction !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer transition-colors"
              >
                <Eraser className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Category Filters Pills Row */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
            Filter Event:
          </span>
          {filterCategories.map((category) => {
            const isSelected = selectedAction === category.value;
            return (
              <button
                key={category.value}
                onClick={() => {
                  setSelectedAction(category.value);
                  setCurrentPage(1); // Reset to page 1
                }}
                className={`px-3 py-1 text-xs border transition-all cursor-pointer font-medium rounded-full ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-900 dark:text-white'
                }`}
              >
                {category.label}{' '}
                <span className={`inline-block ml-1 px-1.5 py-0.2 text-[9px] rounded-full font-mono ${
                  isSelected ? 'bg-blue-500 text-blue-50' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {category.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Table Data list */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-200 dark:border-slate-800 font-mono">
              <th className="px-6 py-4 font-semibold">Event Type</th>
              <th className="px-6 py-4 font-semibold">Activity Details</th>
              <th className="px-6 py-4 font-semibold">Inventory Impact</th>
              <th className="px-6 py-4 font-semibold">Timestamp</th>
              <th className="px-6 py-4 font-semibold text-right">Scope</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/10">
                  <div className="max-w-xs mx-auto flex flex-col items-center justify-center space-y-2">
                    <Activity className="w-8 h-8 text-slate-300 stroke-1" />
                    <p className="font-medium text-slate-500 dark:text-slate-400">No matching events logged</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {logs.length === 0 
                        ? "Perform actions like importing vouchers, changing status, or dispensing codes to trigger log history."
                        : "No logs matched your active search query or filter category."}
                    </p>
                    {(searchQuery || selectedAction !== 'all') && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-2 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded transition-colors"
                      >
                        Reset active filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => {
                const badge = getEventBadge(log);
                const isAddition = log.count > 0;
                const isReduction = log.count < 0;

                return (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800/50 transition-colors">
                    {/* Column 1: Event Type */}
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold border rounded-sm tracking-tight ${badge.bgColor}`}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </div>
                    </td>

                    {/* Column 2: Details description */}
                    <td className="px-6 py-4 font-normal text-slate-700">
                      <p className="max-w-md font-sans text-slate-600 dark:text-slate-300 leading-relaxed break-all">
                        {log.details || log.filename || 'Action executed successfully.'}
                      </p>
                    </td>

                    {/* Column 3: Quantity change impact */}
                    <td className="px-6 py-4">
                      {isAddition ? (
                        <span className="font-mono font-bold text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-sm">
                          +{log.count}
                        </span>
                      ) : isReduction ? (
                        <span className="font-mono font-bold text-xs text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-sm">
                          {log.count}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-400 dark:text-slate-500 px-2 py-0.5">
                          —
                        </span>
                      )}
                    </td>

                    {/* Column 4: Timestamp */}
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-sans">
                      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {log.date ? new Date(log.date).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          }) : 'N/A'}
                        </span>
                      </div>
                    </td>

                    {/* Column 5: Status / Scope */}
                    <td className="px-6 py-4 text-right">
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-sm">
                        SYSTEM
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar Footer */}
      {totalItems > 0 && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing{' '}
            <span className="font-semibold text-slate-800">
              {Math.min((safeCurrentPage - 1) * itemsPerPage + 1, totalItems)}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(safeCurrentPage * itemsPerPage, totalItems)}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{totalItems}</span>{' '}
            events
            {selectedAction !== 'all' || searchQuery ? ' (filtered)' : ''}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              className={`p-2 border border-slate-200 dark:border-slate-800 rounded-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 transition-colors ${
                safeCurrentPage === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white dark:bg-slate-900 cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dynamic page buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                // Show pages close to current page
                return Math.abs(page - safeCurrentPage) <= 2 || page === 1 || page === totalPages;
              })
              .map((page, idx, arr) => {
                const isPageSelected = safeCurrentPage === page;
                const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;

                return (
                  <React.Fragment key={page}>
                    {showEllipsis && <span className="px-2 text-slate-400 dark:text-slate-500 text-xs">...</span>}
                    <button
                      onClick={() => handlePageChange(page)}
                      className={`min-w-8 h-8 px-2 border text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                        isPageSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 hover:text-slate-900 dark:text-white'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage === totalPages}
              className={`p-2 border border-slate-200 dark:border-slate-800 rounded-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 transition-colors ${
                safeCurrentPage === totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white dark:bg-slate-900 cursor-pointer'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
