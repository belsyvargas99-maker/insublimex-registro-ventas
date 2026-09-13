import React from 'react';
import { ExternalLink, Share2, LogOut, RefreshCw, FolderOpen, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BRAND } from '../config/brand';

export interface AdminConfig {
  google: boolean;
  spreadsheetUrl: string;
  sheetName: string;
  driveFolderUrl: string;
  asesoras: string[];
  pending: number;
}

interface SheetConnectorBarProps {
  config: AdminConfig | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  onOpenShare: () => void;
}

export const SheetConnectorBar: React.FC<SheetConnectorBarProps> = ({ config, isRefreshing, onRefresh, onLogout, onOpenShare }) => {
  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={BRAND.logo} alt={BRAND.name} className="w-10 h-10 rounded-full object-cover shadow-xs" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">{BRAND.name}</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                Registro de ventas
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Ventas cerradas por WhatsApp → validación → hoja de Google de la empresa</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            type="button"
            onClick={onOpenShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Enlace para el cliente</span>
          </button>

          {config?.google ? (
            <div className="flex items-center gap-1.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-2.5 py-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <a href={config.spreadsheetUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald-900 hover:underline inline-flex items-center gap-1">
                Hoja de ventas <ExternalLink className="w-3 h-3" />
              </a>
              {config.driveFolderUrl && (
                <a href={config.driveFolderUrl} target="_blank" rel="noreferrer" className="text-emerald-800 hover:underline inline-flex items-center gap-1 ml-1" title="Carpeta de comprobantes en Drive">
                  <FolderOpen className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5 text-xs text-amber-900" title="Las ventas se guardan en el servidor y se pasarán a la hoja cuando Google esté conectado">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-semibold">Google sin conectar</span>
            </div>
          )}

          {config && config.pending > 0 && (
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-1 rounded-lg" title="Registros esperando escribirse en la hoja">
              {config.pending} en cola
            </span>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer disabled:opacity-50"
            title="Actualizar desde la hoja"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
            title="Salir"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
