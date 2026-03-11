import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import {
  Percent,
  Plus,
  Trash2,
  Save,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaxRule {
  _id?: string;
  name: string;
  rate: number;
  applyToAll: boolean;
}

interface TaxSettingsData {
  _id: string;
  enabled: boolean;
  taxLabel: string;
  defaultRate: number;
  inclusive: boolean;
  rules: TaxRule[];
}

interface ApiResponse {
  success: boolean;
  data: TaxSettingsData;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_RULE: Omit<TaxRule, '_id'> = { name: '', rate: 0, applyToAll: true };

const fetchTaxSettings = async (): Promise<TaxSettingsData> => {
  const res = await api.get<ApiResponse>('/api/vendors/tax');
  return res.data.data;
};

// ─── Component ────────────────────────────────────────────────────────────────

const TaxSettings: React.FC = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['vendor-tax'], queryFn: fetchTaxSettings });

  // Local form state (synced when data loads)
  const [enabled, setEnabled] = useState(false);
  const [taxLabel, setTaxLabel] = useState('VAT');
  const [defaultRate, setDefaultRate] = useState(13);
  const [inclusive, setInclusive] = useState(false);
  const [rules, setRules] = useState<(TaxRule & { isNew?: boolean })[]>([]);

  // Sync remote → local once loaded
  const [synced, setSynced] = useState(false);
  React.useEffect(() => {
    if (data && !synced) {
      setEnabled(data.enabled);
      setTaxLabel(data.taxLabel);
      setDefaultRate(data.defaultRate);
      setInclusive(data.inclusive);
      setRules(data.rules);
      setSynced(true);
    }
  }, [data, synced]);

  // ── Save general settings ────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload: Partial<TaxSettingsData>) =>
      api.put<ApiResponse>('/api/vendors/tax', payload),
    onSuccess: (res) => {
      queryClient.setQueryData(['vendor-tax'], res.data.data);
      setRules(res.data.data.rules);
      toast.success('Tax settings saved');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(err.response?.data?.message ?? 'Failed to save tax settings');
    },
  });

  // ── Delete a rule ────────────────────────────────────────────────────────
  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => api.delete<ApiResponse>(`/api/vendors/tax/rules/${ruleId}`),
    onSuccess: (res) => {
      queryClient.setQueryData(['vendor-tax'], res.data.data);
      setRules(res.data.data.rules);
      toast.success('Rule removed');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(err.response?.data?.message ?? 'Failed to remove rule');
    },
  });

  // ── Local rule management (before save) ─────────────────────────────────
  const addRule = () =>
    setRules((prev) => [...prev, { ...DEFAULT_RULE, isNew: true }]);

  const updateRule = (idx: number, field: keyof TaxRule, value: string | number | boolean) =>
    setRules((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );

  const removeRule = (idx: number) => {
    const rule = rules[idx];
    if (rule._id) {
      deleteRuleMutation.mutate(rule._id);
    } else {
      setRules((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleSave = () => {
    // Validate rules
    for (const r of rules) {
      if (!r.name.trim()) {
        toast.error('All tax rules must have a name');
        return;
      }
      if (r.rate < 0 || r.rate > 100) {
        toast.error('Tax rate must be between 0 and 100');
        return;
      }
    }
    saveMutation.mutate({ enabled, taxLabel, defaultRate, inclusive, rules });
  };

  // ── Example price preview ────────────────────────────────────────────────
  const examplePrice = 1000;
  const previewTax = enabled ? (examplePrice * defaultRate) / 100 : 0;
  const previewFinal = inclusive
    ? examplePrice
    : examplePrice + previewTax;
  const previewBase = inclusive
    ? examplePrice - previewTax
    : examplePrice;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Percent className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tax Settings</h1>
            <p className="text-sm text-gray-500">Configure how tax is calculated on your products</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* General Settings card */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {/* Enable / disable */}
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Enable Tax Collection</p>
            <p className="text-xs text-gray-500 mt-0.5">
              When enabled, tax will be calculated on all applicable products
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled((p) => !p)}
            className="shrink-0"
            aria-label={enabled ? 'Disable tax' : 'Enable tax'}
          >
            {enabled ? (
              <ToggleRight className="w-8 h-8 text-green-600" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-400" />
            )}
          </button>
        </div>

        {/* Tax label */}
        <div className="px-5 py-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tax Label
            </label>
            <input
              type="text"
              maxLength={30}
              value={taxLabel}
              onChange={(e) => setTaxLabel(e.target.value)}
              placeholder="e.g. VAT, GST"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-400 mt-1">Shown on invoices and checkout</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Default Rate (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={defaultRate}
              onChange={(e) => setDefaultRate(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-400 mt-1">Applied when no rule matches</p>
          </div>
        </div>

        {/* Inclusive / exclusive */}
        <div className="flex items-start gap-4 px-5 py-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Pricing Type</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Choose whether listed prices already include tax or not
            </p>
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm shrink-0">
            <button
              type="button"
              onClick={() => setInclusive(false)}
              className={`px-4 py-2 font-medium transition-colors ${
                !inclusive ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Tax Exclusive
            </button>
            <button
              type="button"
              onClick={() => setInclusive(true)}
              className={`px-4 py-2 font-medium transition-colors ${
                inclusive ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Tax Inclusive
            </button>
          </div>
        </div>
      </div>

      {/* Live preview card */}
      {enabled && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-green-700 mt-0.5 shrink-0" />
          <div className="text-sm text-green-800 space-y-0.5">
            <p className="font-semibold">Live Preview — NPR {examplePrice.toLocaleString()} product</p>
            <p>
              Base price: <strong>NPR {previewBase.toFixed(2)}</strong> &nbsp;·&nbsp;
              {taxLabel} ({defaultRate}%): <strong>NPR {previewTax.toFixed(2)}</strong> &nbsp;·&nbsp;
              Customer pays: <strong>NPR {previewFinal.toFixed(2)}</strong>
              {inclusive && ' (tax included)'}
            </p>
          </div>
        </div>
      )}

      {/* Tax Rules card */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-800">Tax Rules</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Override the default rate for specific product types
            </p>
          </div>
          <button
            type="button"
            onClick={addRule}
            className="flex items-center gap-1.5 text-sm font-medium text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-10">
            No custom rules — the default rate applies to all products.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rules.map((rule, idx) => (
              <div key={rule._id ?? `new-${idx}`} className="px-5 py-3 flex items-center gap-3">
                {/* Rule name */}
                <input
                  type="text"
                  placeholder="Rule name (e.g. Electronics)"
                  value={rule.name}
                  onChange={(e) => updateRule(idx, 'name', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />

                {/* Rate */}
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={rule.rate}
                    onChange={(e) => updateRule(idx, 'rate', Number(e.target.value))}
                    className="w-20 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-right"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>

                {/* Apply to all toggle */}
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={rule.applyToAll}
                    onChange={(e) => updateRule(idx, 'applyToAll', e.target.checked)}
                    className="w-3.5 h-3.5 accent-green-600"
                  />
                  All products
                </label>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => removeRule(idx)}
                  disabled={deleteRuleMutation.isPending}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                  aria-label="Remove rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {rules.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl">
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Rules without "All products" checked can be extended with category targeting via
              the API. Click <strong>Save Changes</strong> to apply unsaved rule edits.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxSettings;
