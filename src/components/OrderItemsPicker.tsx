import React, { useMemo, useState } from 'react';
import { Plus, Minus, Trash2, Search, ShoppingBag } from 'lucide-react';
import { CATALOG_CATEGORIES, CATALOG_PRODUCTS } from '../data/catalogo';
import { OrderItem } from '../types';
import { formatUSD } from '../config/brand';

const OTHER_PRODUCT = '__otro__';

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

export const orderTotal = (items: OrderItem[]) =>
  Number(items.reduce((acc, it) => acc + (it.unitPrice ?? 0) * it.quantity, 0).toFixed(2));

export const orderHasUnpriced = (items: OrderItem[]) => items.some((it) => it.unitPrice == null);

/** Resumen de una línea para mostrar y para guardar en la hoja: "Combo Iniciador ×2". */
export const orderSummary = (items: OrderItem[]) =>
  items.map((it) => `${it.name} ×${it.quantity}`).join(' | ');

interface OrderItemsPickerProps {
  items: OrderItem[];
  onChange: (items: OrderItem[]) => void;
  /** Estilo de los inputs del formulario que lo contiene. */
  inputCls: string;
  /** Si es true, el asesor puede escribir el precio de productos fuera de catálogo. */
  allowCustomPrice?: boolean;
  compact?: boolean;
}

export const OrderItemsPicker: React.FC<OrderItemsPickerProps> = ({ items, onChange, inputCls, allowCustomPrice = false, compact = false }) => {
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  const filtered = useMemo(() => {
    const q = fold(filter);
    return q ? CATALOG_PRODUCTS.filter((p) => fold(p.name).includes(q)) : CATALOG_PRODUCTS;
  }, [filter]);

  const isOther = selectedId === OTHER_PRODUCT;
  const selected = CATALOG_PRODUCTS.find((p) => p.id === selectedId) ?? null;
  const canAdd = isOther ? customName.trim().length > 1 : !!selected;

  const addItem = () => {
    if (!canAdd) return;
    const next = [...items];
    if (isOther) {
      const price = allowCustomPrice && customPrice.trim() ? Number(customPrice) : null;
      next.push({ id: `otro-${Date.now()}`, name: customName.trim(), quantity: 1, unitPrice: Number.isFinite(price as number) ? price : null, category: 'Otro / Consultar' });
      setCustomName('');
      setCustomPrice('');
    } else if (selected) {
      const existing = next.find((it) => it.id === selected.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        const cat = CATALOG_CATEGORIES.find((c) => c.id === selected.category)?.label ?? selected.category;
        next.push({ id: selected.id, name: selected.name, quantity: 1, unitPrice: selected.price, category: cat });
      }
    }
    onChange(next);
    setSelectedId('');
    setFilter('');
  };

  const setQty = (id: string, qty: number) => {
    onChange(items.map((it) => (it.id === id ? { ...it, quantity: Math.max(1, Math.floor(qty) || 1) } : it)));
  };

  const setPrice = (id: string, price: string) => {
    const n = Number(price);
    onChange(items.map((it) => (it.id === id ? { ...it, unitPrice: price.trim() === '' || !Number.isFinite(n) ? null : n } : it)));
  };

  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));

  const total = orderTotal(items);
  const unpriced = orderHasUnpriced(items);

  return (
    <div className="space-y-3">
      {/* Elegir y agregar */}
      <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-[1fr_2fr_auto]' : 'sm:grid-cols-[1fr_2fr_auto]'} gap-2.5 items-end`}>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Filtrar lista</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Ej: combo, F570, tinta…"
              className={`${inputCls} pl-10`}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Producto</label>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className={inputCls}>
            <option value="">Selecciona un producto…</option>
            {CATALOG_CATEGORIES.map((cat) => {
              const list = filtered.filter((p) => p.category === cat.id);
              if (!list.length) return null;
              return (
                <optgroup key={cat.id} label={cat.label}>
                  {list.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.price != null ? ` — ${formatUSD(p.price)}` : ' — consultar precio'}
                    </option>
                  ))}
                </optgroup>
              );
            })}
            <optgroup label="No está en la lista">
              <option value={OTHER_PRODUCT}>Otro producto (escribir)</option>
            </optgroup>
          </select>
        </div>
        <button
          type="button"
          onClick={addItem}
          disabled={!canAdd}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Agregar
        </button>
      </div>

      {isOther && (
        <div className={`grid grid-cols-1 ${allowCustomPrice ? 'sm:grid-cols-[2fr_1fr]' : ''} gap-2.5`}>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Escribe el producto tal como te lo indicó el asesor"
            className={inputCls}
          />
          {allowCustomPrice && (
            <input
              type="number"
              min="0"
              step="0.01"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder="Precio unitario USD"
              className={inputCls}
            />
          )}
        </div>
      )}

      {/* Pedido */}
      {items.length === 0 ? (
        <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
          <ShoppingBag className="w-4 h-4 text-slate-400" />
          Aún no has agregado productos. Elige uno y pulsa "Agregar"; puedes agregar todos los que compraste.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-2 px-3 py-2.5 bg-white">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{it.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {it.unitPrice != null ? `${formatUSD(it.unitPrice)} c/u` : 'Precio según cotización del asesor'}
                    {it.category ? ` · ${it.category}` : ''}
                  </p>
                  {allowCustomPrice && it.unitPrice == null && (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Precio unitario USD"
                      onChange={(e) => setPrice(it.id, e.target.value)}
                      className="mt-1 w-40 px-2 py-1 text-xs border border-slate-300 rounded-lg"
                    />
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => setQty(it.id, it.quantity - 1)} className="w-7 h-7 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer" aria-label="Menos">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => setQty(it.id, parseInt(e.target.value) || 1)}
                    className="w-12 text-center text-sm font-bold border border-slate-300 rounded-lg py-1"
                    aria-label="Cantidad"
                  />
                  <button type="button" onClick={() => setQty(it.id, it.quantity + 1)} className="w-7 h-7 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer" aria-label="Más">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="w-24 text-right text-sm font-bold text-slate-900 shrink-0">
                  {it.unitPrice != null ? formatUSD(it.unitPrice * it.quantity) : '—'}
                </div>
                <button type="button" onClick={() => remove(it.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0" aria-label="Quitar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 text-sm">
            <span className="font-semibold text-slate-700">
              Total según catálogo{unpriced ? ' (sin contar productos a cotizar)' : ''}
            </span>
            <span className="text-lg font-black text-emerald-700">{formatUSD(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
