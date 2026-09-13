import { useCallback, useEffect, useMemo, useState } from 'react';
import { CustomerSaleRecord, SheetSyncLog, SmartSummaryMetrics } from './types';
import { LoginScreen } from './components/LoginScreen';
import { SheetConnectorBar, AdminConfig } from './components/SheetConnectorBar';
import { MetricsBar } from './components/MetricsBar';
import { SmartRegistrationForm } from './components/SmartRegistrationForm';
import { RecordsTable } from './components/RecordsTable';
import { LiveSyncLogs } from './components/LiveSyncLogs';
import { PublicCustomerForm } from './components/PublicCustomerForm';
import { ShareCustomerFormModal } from './components/ShareCustomerFormModal';
import { ShieldCheck, CheckCircle2, AlertCircle, Share2, ExternalLink } from 'lucide-react';
import { BRAND } from './config/brand';

const TOKEN_KEY = 'insublimex_admin_token';
const POLL_MS = 15_000;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });

const isCustomerUrl = () => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname;
  return (
    params.get('portal') === 'cliente' ||
    params.get('view') === 'cliente' ||
    params.get('form') === '1' ||
    path.startsWith('/portal-cliente') ||
    path.startsWith('/registro') ||
    path.startsWith('/cliente')
  );
};

export default function App() {
  const [isCustomerView, setIsCustomerView] = useState(isCustomerUrl);
  const [isAdminPreview, setIsAdminPreview] = useState(false);

  const [token, setToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [records, setRecords] = useState<CustomerSaleRecord[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState<SheetSyncLog[]>([]);
  const [bannerNotice, setBannerNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const addLog = useCallback((type: SheetSyncLog['type'], message: string, status: SheetSyncLog['status'], details?: string) => {
    setLogs((prev) => [
      { id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: new Date().toISOString(), type, message, status, details },
      ...prev.slice(0, 49),
    ]);
  }, []);

  // ───────── llamadas al servidor ─────────

  const api = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const res = await fetch(path, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(token ? { 'x-admin-token': token } : {}), ...(init.headers || {}) },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setToken(null);
        sessionStorage.removeItem(TOKEN_KEY);
        throw new Error(data.error || 'Sesión vencida.');
      }
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      return data;
    },
    [token]
  );

  const loadData = useCallback(
    async (refresh = false) => {
      if (!token) return;
      setIsRefreshing(true);
      try {
        const [cfg, data] = await Promise.all([api('/api/admin/config'), api(`/api/admin/records${refresh ? '?refresh=1' : ''}`)]);
        setConfig({ ...cfg, pending: data.pending ?? cfg.pending });
        setRecords(data.records || []);
      } catch (err: any) {
        addLog('error', 'No se pudo leer la hoja de ventas', 'error', err.message);
      } finally {
        setIsRefreshing(false);
      }
    },
    [token, api, addLog]
  );

  // Carga inicial + refresco periódico (solo en el panel con sesión)
  useEffect(() => {
    if (!token || isCustomerView) return;
    loadData();
    const id = setInterval(() => loadData(), POLL_MS);
    return () => clearInterval(id);
  }, [token, isCustomerView, loadData]);

  // Detecta registros nuevos que entran por el portal para avisar
  const [knownIds, setKnownIds] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (!records.length) return;
    const ids = new Set(records.map((r) => r.id));
    if (knownIds) {
      const nuevos = records.filter((r) => !knownIds.has(r.id) && r.source === 'portal-cliente');
      if (nuevos.length) {
        const r = nuevos[0];
        setBannerNotice({
          type: 'info',
          message: `Nuevo pago desde el portal: ${r.customerName} · ${r.productName} · ${r.paymentMethod}${r.paymentReference ? ' · ref ' + r.paymentReference : ''}. Verifica el pago y coordina la entrega.`,
        });
        nuevos.forEach((n) => addLog('sync', `[Portal] ${n.customerName} registró un pago (${n.id})`, 'success', `Atendió: ${n.asesora}`));
      }
    }
    setKnownIds(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records]);

  // ───────── sesión ─────────

  const handleLogin = async (pin: string) => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) throw new Error(data.error || 'No se pudo iniciar sesión.');
      sessionStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      addLog('sync', 'Sesión iniciada en el panel', 'success');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setRecords([]);
    setConfig(null);
    setKnownIds(null);
  };

  // ───────── acciones ─────────

  const handleRegisterRecord = async (data: Omit<CustomerSaleRecord, 'id' | 'timestamp'>, receiptFile: File | null) => {
    setIsSyncing(true);
    try {
      const receiptImage = receiptFile ? await readFileAsDataUrl(receiptFile) : '';
      const res = await api('/api/admin/records', { method: 'POST', body: JSON.stringify({ ...data, receiptImage }) });
      const rec: CustomerSaleRecord = res.record;
      setRecords((prev) => [rec, ...prev]);
      if (res.queued) {
        addLog('sync', `Venta ${rec.id} guardada en el servidor; se pasará a la hoja en el próximo reintento`, 'warning');
        setBannerNotice({ type: 'info', message: `Venta registrada (${rec.id}). Google no respondió ahora mismo: quedó en cola y se escribirá sola en la hoja.` });
      } else {
        addLog('sync', `Venta ${rec.id} escrita en la hoja: ${rec.customerName} · ${rec.productName}`, 'success', `Total ${rec.totalAmount} USD`);
        setBannerNotice({ type: 'success', message: `Venta de ${rec.customerName} registrada en la hoja de Insublimex (${rec.id}).` });
      }
      setTimeout(() => loadData(true), 1500);
    } catch (err: any) {
      addLog('error', 'No se pudo registrar la venta', 'error', err.message);
      setBannerNotice({ type: 'error', message: err.message });
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSetStatus = async (id: string, status: CustomerSaleRecord['status']) => {
    setIsSyncing(true);
    try {
      const res = await api(`/api/admin/records/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
      setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status: res.record.status } : r)));
      addLog('validation', `${id} marcado como ${status}`, 'success');
    } catch (err: any) {
      addLog('error', `No se pudo cambiar el estado de ${id}`, 'error', err.message);
      setBannerNotice({ type: 'error', message: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  // ───────── métricas ─────────

  const metrics: SmartSummaryMetrics = useMemo(() => {
    const totalRevenue = records.reduce((acc, r) => acc + (r.totalAmount || 0), 0);
    const totalTransactions = records.length;
    const uniqueCustomers = new Set(records.map((r) => (r.cedula || r.customerEmail).toLowerCase())).size;
    const counts: Record<string, number> = {};
    records.forEach((r) => (counts[r.productName] = (counts[r.productName] || 0) + 1));
    const topProduct = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const synced = records.filter((r) => r.syncedToSheets).length;
    return {
      totalRevenue,
      totalTransactions,
      uniqueCustomers,
      topProduct,
      averageTicket: totalTransactions ? totalRevenue / totalTransactions : 0,
      syncRate: totalTransactions ? Math.round((synced / totalTransactions) * 100) : 100,
    };
  }, [records]);

  // ───────── vistas ─────────

  if (isCustomerView) {
    return (
      <PublicCustomerForm
        isAdminViewing={isAdminPreview && !!token}
        onBackToAdmin={
          isAdminPreview
            ? () => {
                setIsCustomerView(false);
                setIsAdminPreview(false);
                window.history.replaceState({}, '', window.location.pathname);
              }
            : undefined
        }
      />
    );
  }

  const openCustomerPreview = () => {
    setIsAdminPreview(true);
    setIsCustomerView(true);
  };

  if (!token) {
    return <LoginScreen onLogin={handleLogin} isLoading={isAuthLoading} errorMessage={authError} onOpenCustomerForm={() => setIsCustomerView(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased">
      <SheetConnectorBar config={config} isRefreshing={isRefreshing} onRefresh={() => loadData(true)} onLogout={handleLogout} onOpenShare={() => setIsShareModalOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {bannerNotice && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
              bannerNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : bannerNotice.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {bannerNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span className="font-medium">{bannerNotice.message}</span>
            </div>
            <button onClick={() => setBannerNotice(null)} className="text-slate-400 hover:text-slate-600 font-bold px-1">
              ×
            </button>
          </div>
        )}

        {config && !config.google && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">La hoja de Google todavía no está conectada al servidor.</p>
              <p className="mt-0.5">
                Las ventas que se registren se guardan en el servidor y pasarán solas a la hoja cuando la cuenta de servicio esté configurada. Nada se pierde.
              </p>
            </div>
          </div>
        )}

        {/* Enlace del cliente */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Enlace para que el cliente registre su pago</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cierras la venta por WhatsApp, el cliente paga y le mandas el enlace. Él elige el producto, el monto y la referencia; aquí te aparece como pendiente de verificar y queda en la hoja.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setIsShareModalOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer">
              <Share2 className="w-3.5 h-3.5" />
              <span>Copiar enlace / mensaje WhatsApp</span>
            </button>
            <button type="button" onClick={openCustomerPreview} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver como cliente</span>
            </button>
          </div>
        </div>

        <MetricsBar metrics={metrics} sheetRowsCount={records.filter((r) => r.syncedToSheets).length} />

        <SmartRegistrationForm existingRecords={records} onSubmit={handleRegisterRecord} isSyncing={isSyncing} asesoras={config?.asesoras || []} connectedSheetTitle={config?.google ? `Hoja de ventas · pestaña ${config.sheetName}` : undefined} />

        <RecordsTable records={records} spreadsheetUrl={config?.spreadsheetUrl || ''} onSetStatus={handleSetStatus} isSyncing={isSyncing} />

        <LiveSyncLogs logs={logs} onClearLogs={() => setLogs([])} />
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-4 mt-8 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>
            {BRAND.name} · Registro de ventas · {BRAND.legal.razonSocial} · RIF {BRAND.legal.rif}
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Datos en la cuenta Google de Insublimex
          </span>
        </div>
      </footer>

      <ShareCustomerFormModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} onOpenPreview={openCustomerPreview} />
    </div>
  );
}
