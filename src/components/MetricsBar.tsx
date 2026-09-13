import React from 'react';
import { DollarSign, Users, ShoppingCart, ShieldCheck, CheckCircle2, TrendingUp } from 'lucide-react';
import { SmartSummaryMetrics } from '../types';

interface MetricsBarProps {
  metrics: SmartSummaryMetrics;
  sheetRowsCount: number;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ metrics, sheetRowsCount }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {/* Metric 1: Total Revenue */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Ingresos Totales
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
            ${metrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Suma de lo registrado (incluye abonos)</p>
      </div>

      {/* Metric 2: Transactions */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Ventas / Clientes
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
            {metrics.totalTransactions}
          </span>
          <span className="text-xs text-slate-500">
            ({metrics.uniqueCustomers} únicos)
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Clientes únicos por correo</p>
      </div>

      {/* Metric 3: Average Ticket */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Ticket Promedio
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-mono">
            ${metrics.averageTicket.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Promedio por registro</p>
      </div>

      {/* Metric 4: Sheets Sync Health */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            En Google Sheets
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-bold text-emerald-700 tracking-tight font-mono">
            {metrics.syncRate}%
          </span>
          <span className="text-xs text-slate-500 font-mono">
            ({sheetRowsCount} en la hoja)
          </span>
        </div>
        <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
          <CheckCircle2 className="w-3 h-3" />
          Registros ya escritos en la hoja
        </p>
      </div>
    </div>
  );
};
