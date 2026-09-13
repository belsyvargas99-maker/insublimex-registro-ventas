import React from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { SheetSyncLog } from '../types';

interface LiveSyncLogsProps {
  logs: SheetSyncLog[];
  onClearLogs: () => void;
}

export const LiveSyncLogs: React.FC<LiveSyncLogsProps> = ({ logs, onClearLogs }) => {
  return (
    <div id="live-audit-logs" className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Actividad reciente
          </h3>
        </div>

        {logs.length > 0 && (
          <button
            type="button"
            onClick={onClearLogs}
            className="text-[11px] text-slate-400 hover:text-slate-600 transition"
          >
            Limpiar logs
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-400">
            Esperando transacciones y sincronizaciones...
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-2.5 text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
            >
              {log.status === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              {log.status === 'warning' && (
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              {log.status === 'error' && (
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800 truncate">{log.message}</span>
                  <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString('es-VE')}
                  </span>
                </div>
                {log.details && (
                  <p className="text-[11px] text-slate-500 mt-0.5 break-words">{log.details}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
