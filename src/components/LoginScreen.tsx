import React, { useState } from 'react';
import { Info, ShieldCheck, Lock, ArrowRight, KeyRound } from 'lucide-react';
import { BRAND } from '../config/brand';

interface LoginScreenProps {
  onLogin: (pin: string) => Promise<void>;
  isLoading: boolean;
  errorMessage?: string | null;
  onOpenCustomerForm?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, isLoading, errorMessage, onOpenCustomerForm }) => {
  const [pin, setPin] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    await onLogin(pin.trim());
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-7 sm:p-8 shadow-2xl relative z-10 text-center">
        <img src={BRAND.logo} alt={BRAND.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-5 shadow-lg" />

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-bold uppercase tracking-wider mb-3">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span>{BRAND.name} · Panel del equipo</span>
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight">Registro de ventas</h1>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Para asesoras y administración de INSUBLIMEX. Cada venta queda en la hoja de Google de la empresa.
        </p>

        {onOpenCustomerForm && (
          <div className="my-5 p-4 bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 rounded-xl text-left">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">¿Eres cliente y ya pagaste tu pedido?</p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  Registra tu pago aquí para que el asesor lo confirme y coordine la entrega:
                </p>
                <button
                  type="button"
                  onClick={onOpenCustomerForm}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  <span>Registrar mi pago</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs text-left leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="relative">
            <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
            <input
              type="password"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Clave del equipo"
              className="w-full pl-10 pr-3 py-3 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !pin.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Entrando…</span>
              </>
            ) : (
              <>
                <span>Entrar al panel</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-slate-500 mt-5 leading-relaxed">
          La clave la administra la gerencia de Insublimex. Si no la tienes, pídela por WhatsApp interno.
        </p>
      </div>
    </div>
  );
};
