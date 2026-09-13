import React, { useState } from 'react';
import {
  Table,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Search,
  SlidersHorizontal,
  CloudCheck,
  Building2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { CustomerSaleRecord } from '../types';

interface RecordsTableProps {
  records: CustomerSaleRecord[];
  spreadsheetUrl: string;
  onSetStatus: (recordId: string, status: CustomerSaleRecord['status']) => Promise<void>;
  isSyncing: boolean;
}

export const RecordsTable: React.FC<RecordsTableProps> = ({
  records,
  spreadsheetUrl,
  onSetStatus,
  isSyncing,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAsesora, setSelectedAsesora] = useState('all');
  const [onlyPending, setOnlyPending] = useState(false);

  const filteredRecords = records.filter((rec) => {
    const term = searchTerm.toLowerCase();
    const matchesTerm =
      rec.customerName.toLowerCase().includes(term) ||
      rec.customerEmail.toLowerCase().includes(term) ||
      rec.productName.toLowerCase().includes(term) ||
      rec.id.toLowerCase().includes(term);

    const matchesCategory =
      selectedCategory === 'all' || rec.category === selectedCategory;
    const matchesAsesora = selectedAsesora === 'all' || rec.asesora === selectedAsesora;
    const matchesPending = !onlyPending || rec.status === 'Pendiente';

    return matchesTerm && matchesCategory && matchesAsesora && matchesPending;
  });

  const categories = Array.from(new Set(records.map((r) => r.category).filter(Boolean)));
  const asesoras = Array.from(new Set(records.map((r) => r.asesora).filter(Boolean))) as string[];
  const pendingTotal = records.filter((r) => r.status === 'Pendiente').length;

  return (
    <div id="records-database-panel" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header & Controls */}
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Table className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Ventas registradas
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                {records.length} registros
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Cada fila se escribe en tu Google Sheet; el score resume la validación contra catálogo, teléfono y duplicados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar cliente, email, producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-800 w-48 sm:w-60 transition"
            />
          </div>

          {/* Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-700"
              >
                <option value="all">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {asesoras.length > 0 && (
            <select
              value={selectedAsesora}
              onChange={(e) => setSelectedAsesora(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-700"
            >
              <option value="all">Todas las asesoras</option>
              {asesoras.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setOnlyPending((v) => !v)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${
              onlyPending ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Pendientes ({pendingTotal})
          </button>

          {spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver en Google Sheets</span>
            </a>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
            <tr>
              <th scope="col" className="px-4 py-3">Cliente / Contacto</th>
              <th scope="col" className="px-4 py-3">Producto & Categoría</th>
              <th scope="col" className="px-4 py-3 text-right">Cant. x Precio</th>
              <th scope="col" className="px-4 py-3 text-right">Monto Total</th>
              <th scope="col" className="px-4 py-3">Pago / Estado</th>
              <th scope="col" className="px-4 py-3">Validación</th>
              <th scope="col" className="px-4 py-3 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-medium text-slate-600">No hay registros de clientes aún</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Usa el formulario superior para registrar una compra o cargar un ejemplo automático.
                  </p>
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Customer */}
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-slate-900">
                      {rec.customerName}
                      {rec.cedula && <span className="ml-1.5 font-mono text-[10px] font-medium text-slate-500">{rec.cedula}</span>}
                    </div>
                    <div className="text-[11px] text-slate-500">{rec.customerEmail}</div>
                    <div className="text-[11px] text-slate-400">{rec.customerPhone}</div>
                    {(rec.ciudad || rec.estado) && (
                      <div className="text-[11px] text-slate-500 mt-0.5" title={rec.direccion}>
                        {[rec.ciudad, rec.estado].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </td>

                  {/* Product */}
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-slate-900">{rec.productName}</div>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                      {rec.category}
                    </span>
                    {(rec.purchaseDate || rec.asesora) && (
                      <div className="text-[11px] text-slate-500 mt-1">
                        {rec.purchaseDate && <span>Compra: {rec.purchaseDate.split('-').reverse().join('/')}</span>}
                        {rec.purchaseDate && rec.asesora && ' · '}
                        {rec.asesora && <span>{rec.asesora}</span>}
                      </div>
                    )}
                  </td>

                  {/* Quantity & Unit Price */}
                  <td className="px-4 py-3.5 text-right font-mono">
                    <span className="text-slate-800">{rec.quantity}</span> x{' '}
                    <span className="text-slate-500">${rec.unitPrice.toFixed(2)}</span>
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                    ${rec.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Payment & Status */}
                  <td className="px-4 py-3.5">
                    <div className="text-slate-700">
                      {rec.paymentMethod}
                      {rec.paymentType === 'Abono inicial' && (
                        <span className="ml-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Abono</span>
                      )}
                    </div>
                    {rec.paymentReference && (
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5" title="Referencia de pago">
                        Ref. {rec.paymentReference}
                      </div>
                    )}
                    {rec.receiptImageUrl && (
                      <a
                        href={rec.receiptImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-[10px] font-semibold text-emerald-700 hover:underline mt-0.5"
                      >
                        Ver comprobante ↗
                      </a>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        rec.status === 'Pendiente'
                          ? 'text-amber-700 bg-amber-50'
                          : rec.status === 'Completado'
                          ? 'text-slate-600 bg-slate-100'
                          : 'text-emerald-700 bg-emerald-50'
                      }`}
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      {rec.status === 'Pendiente' ? 'Pendiente de verificar' : rec.status}
                    </span>
                  </td>

                  {/* Smart Control Score */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck
                        className={`w-3.5 h-3.5 ${
                          (rec.smartValidation?.score ?? 100) >= 80
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }`}
                      />
                      <span className="font-semibold text-slate-800">
                        {rec.smartValidation?.score ?? 100}%
                      </span>
                    </div>
                    {rec.smartValidation?.isDuplicatePotential && (
                      <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                        Posible Duplicado
                      </div>
                    )}
                  </td>

                  {/* Acción */}
                  <td className="px-4 py-3.5 text-center">
                    {!rec.syncedToSheets ? (
                      <span
                        title="Google no respondió; el servidor lo reintenta solo cada minuto"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800"
                      >
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        En cola
                      </span>
                    ) : rec.status === 'Pendiente' ? (
                      <button
                        type="button"
                        onClick={() => onSetStatus(rec.id, 'Verificado')}
                        disabled={isSyncing}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Verificar pago
                      </button>
                    ) : rec.status === 'Verificado' ? (
                      <button
                        type="button"
                        onClick={() => onSetStatus(rec.id, 'Completado')}
                        disabled={isSyncing}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer disabled:opacity-50"
                        title="Marcar como entregado"
                      >
                        Entregado
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Completado
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
