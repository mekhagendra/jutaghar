import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const DeleteAccount: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (confirm !== 'DELETE') {
      setError('Please type DELETE to confirm.');
      return;
    }

    setLoading(true);
    try {
      await api.delete('/api/auth/account', { data: { password } });
      setSuccess(true);
      logout();
      setTimeout(() => navigate('/'), 3000);
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Failed to delete account. Please try again.');
      } else {
        setError('Failed to delete account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-gray-50 flex items-center justify-center py-20 px-4">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Account Deleted</h2>
          <p className="text-gray-600 text-sm">Your account and associated data have been permanently deleted. You will be redirected shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Delete Account</h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            Permanently delete your JutaGhar account and associated data.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-lg">
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">What gets deleted</h2>
            <ul className="text-gray-600 text-sm list-disc pl-5 space-y-1">
              <li>Your profile information (name, email, phone)</li>
              <li>Your product reviews</li>
              <li>Your saved preferences and cart</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">What is retained</h2>
            <ul className="text-gray-600 text-sm list-disc pl-5 space-y-1">
              <li>Order records are anonymized but kept for legal/accounting purposes</li>
            </ul>
          </section>

          <div className="border-t border-gray-200 pt-6">
            {!user ? (
              <div className="text-center">
                <p className="text-gray-600 text-sm mb-4">You must be logged in to delete your account.</p>
                <a href="/login" className="text-primary-600 hover:underline font-medium">Log in</a>
              </div>
            ) : (
              <form onSubmit={handleDelete} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter your password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type <span className="font-mono font-bold">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="DELETE"
                  />
                </div>

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Permanently Delete My Account'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccount;
