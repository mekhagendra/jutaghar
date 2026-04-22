import React, { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { ShieldCheck, ShieldOff } from 'lucide-react';

type SetupStep = 'idle' | 'scan' | 'confirm' | 'codes';

const MfaSetup: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [step, setStep] = useState<SetupStep>('idle');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [otpauthUri, setOtpauthUri] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Disable flow
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showDisable, setShowDisable] = useState(false);

  const mfaEnabled = user?.mfa?.enabled ?? false;

  const handleSetup = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.post<{ success: boolean; data: { qrDataUrl: string; otpauthUri: string } }>('/api/auth/mfa/setup');
      setQrDataUrl(res.data.data.qrDataUrl);
      setOtpauthUri(res.data.data.otpauthUri);
      setStep('scan');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to start MFA setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const res = await api.post<{ success: boolean; data: { recoveryCodes: string[] } }>('/api/auth/mfa/verify', { code });
      setRecoveryCodes(res.data.data.recoveryCodes);
      setStep('codes');
      updateUser({ ...user!, mfa: { enabled: true } });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await api.post('/api/auth/mfa/disable', { password: disablePassword, code: disableCode });
      updateUser({ ...user!, mfa: { enabled: false } });
      setShowDisable(false);
      setDisablePassword('');
      setDisableCode('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to disable MFA.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'codes') {
    return (
      <div className="max-w-lg mx-auto card">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">MFA Enabled</h2>
        </div>
        <p className="text-gray-600 mb-4">
          Save these recovery codes somewhere safe. Each code can only be used once to bypass MFA if you lose access to your authenticator.
        </p>
        <div className="bg-gray-100 rounded-lg p-4 font-mono text-sm grid grid-cols-2 gap-2 mb-6">
          {recoveryCodes.map(c => <span key={c}>{c}</span>)}
        </div>
        <button className="btn-primary w-full" onClick={() => setStep('idle')}>Done</button>
      </div>
    );
  }

  if (step === 'scan') {
    return (
      <div className="max-w-lg mx-auto card">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Scan QR Code</h2>
        <p className="text-gray-600 mb-4">Scan this code with your authenticator app (e.g. Google Authenticator, Authy).</p>
        {qrDataUrl && <img src={qrDataUrl} alt="MFA QR code" className="mx-auto mb-4 rounded-lg border" style={{ width: 200, height: 200 }} />}
        <p className="text-xs text-gray-400 break-all mb-4">Or enter manually: {otpauthUri}</p>
        <form onSubmit={handleVerify} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">{error}</div>}
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="Enter 6-digit code"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            className="input-field w-full text-center text-2xl tracking-widest"
            autoFocus
          />
          <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full">
            {loading ? 'Verifying…' : 'Activate MFA'}
          </button>
          <button type="button" onClick={() => { setStep('idle'); setError(''); }} className="btn-secondary w-full">Cancel</button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto card">
      <div className="flex items-center gap-2 mb-4">
        {mfaEnabled
          ? <ShieldCheck className="w-6 h-6 text-green-600" />
          : <ShieldOff className="w-6 h-6 text-gray-400" />}
        <h2 className="text-xl font-bold text-gray-900">Two-Factor Authentication</h2>
      </div>

      {mfaEnabled ? (
        <>
          <p className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm mb-6">
            MFA is currently <strong>enabled</strong> on your account.
          </p>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm mb-4">{error}</div>}
          {!showDisable ? (
            <button className="btn-secondary w-full" onClick={() => setShowDisable(true)}>Disable MFA</button>
          ) : (
            <form onSubmit={handleDisable} className="space-y-3">
              <input type="password" placeholder="Current password" value={disablePassword}
                onChange={e => setDisablePassword(e.target.value)} className="input-field w-full" autoComplete="current-password" />
              <input type="text" inputMode="numeric" placeholder="Authenticator code or recovery code"
                value={disableCode} onChange={e => setDisableCode(e.target.value)} className="input-field w-full" />
              <button type="submit" disabled={loading} className="btn-danger w-full">
                {loading ? 'Disabling…' : 'Confirm Disable MFA'}
              </button>
              <button type="button" onClick={() => { setShowDisable(false); setError(''); }} className="btn-secondary w-full">Cancel</button>
            </form>
          )}
        </>
      ) : (
        <>
          <p className="text-gray-600 mb-6">
            Add an extra layer of security to your account by requiring a time-based one-time code when you log in.
          </p>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm mb-4">{error}</div>}
          <button className="btn-primary w-full" disabled={loading} onClick={handleSetup}>
            {loading ? 'Loading…' : 'Set Up MFA'}
          </button>
        </>
      )}
    </div>
  );
};

export default MfaSetup;
