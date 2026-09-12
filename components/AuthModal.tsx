import React, { useState } from 'react';
import { BusinessProfile } from '../types';
import * as db from '../services/storage';
import { Building2, ShieldCheck, User, Mail, Lock, ArrowRight, Sparkles, AlertCircle, Percent } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (business: BusinessProfile) => void;
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [businessName, setBusinessName] = useState('');
  const [tin, setTin] = useState('');
  const [brNumber, setBrNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [slogan, setSlogan] = useState('');
  const [branchCode, setBranchCode] = useState('BR01');
  const [isVatRegistered, setIsVatRegistered] = useState(true);
  const [vatPercent, setVatPercent] = useState<number>(18);
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);
    try {
      const res = await db.login(loginEmail, loginPassword);
      onSuccess(res.business);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      const res = await db.login('admin@pyxis.lk', 'password123');
      onSuccess(res.business);
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (registerPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (registerPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await db.register({
        businessName,
        tin,
        brNumber,
        address,
        phone,
        slogan,
        branchCode: branchCode.trim().toUpperCase() || 'BR01',
        isVatRegistered,
        vatRate: isVatRegistered ? (vatPercent / 100) : 0,
        ownerName,
        ownerEmail,
        password: registerPassword
      });
      onSuccess(res.business);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-xl overflow-hidden my-8 animate-fade-in text-gray-900 dark:text-gray-100">
        
        {/* MODAL HEADER WITH PYXIS BRAND */}
        <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-700 p-6 text-white text-center relative">
          <div className="w-12 h-12 bg-white/10 rounded-xl mx-auto flex items-center justify-center mb-3 shadow-inner backdrop-blur-sm border border-white/20">
            <span className="font-extrabold text-2xl tracking-tighter text-white">Py</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Pyxis Billing System</h2>
          <p className="text-xs text-sky-100 mt-1">
            Official IRD Gazette No. 2481/22 Tax & Commercial Invoicing
          </p>
        </div>

        {/* TABS: SIGN IN vs REGISTER BUSINESS */}
        <div className="flex border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60">
          <button
            type="button"
            onClick={() => { setTab('login'); setErrorMessage(''); }}
            className={`flex-1 py-3.5 text-sm font-bold text-center transition-all border-b-2 ${
              tab === 'login'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-800'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Sign In to Your Business
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setErrorMessage(''); }}
            className={`flex-1 py-3.5 text-sm font-bold text-center transition-all border-b-2 ${
              tab === 'register'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-800'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Register New Business
          </button>
        </div>

        <div className="p-6 md:p-8 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ---------------- LOGIN TAB ---------------- */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                  Business Owner Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 text-gray-400" size={18} />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. owner@yourbusiness.lk"
                    className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 text-gray-400" size={18} />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
              >
                {isLoading ? 'Signing In...' : 'Sign In to Dashboard'}
                <ArrowRight size={18} />
              </button>

              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-slate-700"></div></div>
                <span className="relative bg-white dark:bg-slate-800 px-3 text-xs text-gray-500 uppercase font-semibold">Or Instant Demo</span>
              </div>

              <button
                type="button"
                onClick={handleQuickDemoLogin}
                disabled={isLoading}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 border border-gray-300 dark:border-slate-600"
              >
                <Sparkles size={16} className="text-amber-500" />
                Quick 1-Click Demo Login (Pyxis Enterprise Demo)
              </button>
            </form>
          )}

          {/* ---------------- REGISTER TAB ---------------- */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-6">
              
              {/* SECTION 1: BUSINESS IDENTITY */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-700 pb-2">
                  <Building2 size={18} className="text-sky-600 dark:text-sky-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    1. Business Identification Details
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                    Business / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Apex Trading International (Pvt) Ltd"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      Supplier TIN (9 Digits) *
                    </label>
                    <input
                      type="text"
                      required
                      value={tin}
                      onChange={(e) => setTin(e.target.value)}
                      placeholder="e.g. 102938475"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      BR (Registration) No.
                    </label>
                    <input
                      type="text"
                      value={brNumber}
                      onChange={(e) => setBrNumber(e.target.value)}
                      placeholder="e.g. PV-0012345"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                    Official Business Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="No. 123, Galle Road, Colombo 03"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      Business Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 011 234 5678"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      Branch / Entity Code (QQQQ)
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      placeholder="BR01"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono uppercase focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                    Business Slogan / Header Tagline
                  </label>
                  <input
                    type="text"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    placeholder="e.g. HIGH QUALITY COMMERCIAL SOLUTIONS"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              {/* SECTION 2: VAT & TAX CONFIGURATION */}
              <div className="space-y-3 bg-sky-50/50 dark:bg-slate-700/40 p-4 rounded-xl border border-sky-100 dark:border-slate-600">
                <div className="flex items-center gap-2 border-b border-sky-200 dark:border-slate-600 pb-2">
                  <Percent size={18} className="text-sky-600 dark:text-sky-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    2. VAT & Tax Mode Configuration
                  </h3>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold block">VAT Registered Status</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      Enable to issue official IRD Gazette Tax Invoices
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isVatRegistered}
                      onChange={(e) => setIsVatRegistered(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                  </label>
                </div>

                {isVatRegistered ? (
                  <div className="space-y-2 pt-2 border-t border-sky-200/60 dark:border-slate-600">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-700 dark:text-gray-300">Default VAT Rate:</span>
                      <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-sm bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded border border-sky-200 dark:border-slate-600">
                        {vatPercent}%
                      </span>
                    </div>
                    {/* Interactive VAT Rate Scale / Slider */}
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={vatPercent}
                      onChange={(e) => setVatPercent(parseInt(e.target.value, 10) || 0)}
                      className="w-full accent-sky-600 cursor-pointer h-2 bg-gray-200 dark:bg-slate-600 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                      <span>0% (Exempt)</span>
                      <span>15%</span>
                      <span>18% (Standard IRD)</span>
                      <span>20%</span>
                      <span>30%</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                    Without-VAT mode selected. Invoices will default to commercial non-VAT format.
                  </p>
                )}
              </div>

              {/* SECTION 3: OWNER & ACCOUNT CREDENTIALS */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-700 pb-2">
                  <User size={18} className="text-sky-600 dark:text-sky-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    3. Owner / Administrator Credentials
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                    Owner Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Samantha Perera"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                    Owner Email (Login Username) *
                  </label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="e.g. samantha@apex.lk"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-60"
              >
                {isLoading ? 'Creating Business System...' : 'Complete Registration & Open Billing'}
                <ShieldCheck size={18} />
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
