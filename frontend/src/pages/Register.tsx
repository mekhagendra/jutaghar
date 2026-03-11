import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { UserPlus, ShoppingBag, Store, Factory, Globe, Tag, ChevronRight, ChevronLeft } from 'lucide-react';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  role: z.enum(['user', 'manufacturer', 'importer', 'seller']),
  businessName: z.string().optional(),
  businessAddress: z.string().optional(),
  taxId: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;
type PrimaryType = 'customer' | 'vendor' | null;
type VendorSubType = 'manufacturer' | 'importer' | 'seller' | null;

const VENDOR_SUBTYPES: { value: VendorSubType; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'manufacturer', label: 'Manufacturer', desc: 'You produce or make your own goods', icon: <Factory className="w-6 h-6" /> },
  { value: 'importer',     label: 'Importer',     desc: 'You import goods from abroad',      icon: <Globe className="w-6 h-6" /> },
  { value: 'seller',       label: 'Seller',       desc: 'You resell or trade products',      icon: <Tag className="w-6 h-6" /> },
];

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [primaryType, setPrimaryType] = useState<PrimaryType>(null);
  const [vendorSubType, setVendorSubType] = useState<VendorSubType>(null);

  const isVendor = primaryType === 'vendor';
  const showForm = primaryType === 'customer' || (isVendor && vendorSubType !== null);
  const effectiveRole: RegisterForm['role'] =
    primaryType === 'customer' ? 'user' : (vendorSubType as Exclude<VendorSubType, null>) ?? 'seller';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'user' },
  });

  const handlePrimarySelect = (type: PrimaryType) => {
    setPrimaryType(type);
    setVendorSubType(null);
    if (type === 'customer') setValue('role', 'user');
  };

  const handleSubTypeSelect = (sub: VendorSubType) => {
    setVendorSubType(sub);
    if (sub) setValue('role', sub);
  };

  const onSubmit = async (data: RegisterForm) => {
    try {
      setLoading(true);
      setError('');
      await registerUser({ ...data, role: effectiveRole });
      navigate('/');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full card">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <UserPlus className="w-12 h-12 text-primary-600" />
          </div>
          <h2 className="text-3xl font-bold">Create Account</h2>
          <p className="text-gray-600 mt-2">Join Juta Ghar today</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8 text-sm">
          <span className={`flex items-center gap-1.5 font-medium ${primaryType !== null ? 'text-primary-600' : 'text-gray-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${primaryType !== null ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</span>
            Account type
          </span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <span className={`flex items-center gap-1.5 font-medium ${isVendor && vendorSubType !== null ? 'text-primary-600' : isVendor && vendorSubType === null ? 'text-gray-700' : 'text-gray-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isVendor && vendorSubType !== null ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
            Vendor type
          </span>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <span className={`flex items-center gap-1.5 font-medium ${showForm ? 'text-gray-700' : 'text-gray-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${showForm ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-500'}`}>3</span>
            Your details
          </span>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Step 1 — Primary type */}
        {primaryType === null && (
          <div className="space-y-4">
            <p className="text-center text-gray-600 font-medium mb-6">How would you like to use Juta Ghar?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handlePrimarySelect('customer')}
                className="group p-6 border-2 border-gray-200 rounded-xl text-left hover:border-primary-500 hover:bg-primary-50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 group-hover:bg-primary-100 flex items-center justify-center text-blue-600 group-hover:text-primary-600 transition-colors">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-lg">Customer</div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handlePrimarySelect('vendor')}
                className="group p-6 border-2 border-gray-200 rounded-xl text-left hover:border-primary-500 hover:bg-primary-50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 group-hover:bg-primary-100 flex items-center justify-center text-green-600 group-hover:text-primary-600 transition-colors">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-lg">Vendor</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Vendor sub-type */}
        {isVendor && vendorSubType === null && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button type="button" onClick={() => setPrimaryType(null)} className="text-gray-400 hover:text-gray-600">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <p className="text-gray-600 font-medium">Your Business Type?</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {VENDOR_SUBTYPES.map(({ value, label, desc, icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleSubTypeSelect(value)}
                  className="group p-5 border-2 border-gray-200 rounded-xl text-left hover:border-primary-500 hover:bg-primary-50 transition-all flex items-center gap-4"
                >
                  <div className="w-11 h-11 rounded-full bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center text-gray-500 group-hover:text-primary-600 transition-colors flex-shrink-0">
                    {icon}
                  </div>
                  <div>
                    <div className="font-bold text-gray-800">{label}</div>
                    <div className="text-sm text-gray-500">{desc}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-400 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Registration form */}
        {showForm && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Selected type summary + change link */}
            <div className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-lg px-4 py-3 text-sm">
              <span className="text-primary-700 font-medium capitalize">
                {isVendor ? `Vendor — ${vendorSubType}` : 'Customer'}
              </span>
              <button
                type="button"
                onClick={() => { setPrimaryType(null); setVendorSubType(null); }}
                className="text-primary-600 hover:text-primary-700 underline text-xs"
              >
                Change
              </button>
            </div>

            {/* Hidden role field */}
            <input type="hidden" {...register('role')} value={effectiveRole} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input {...register('fullName')} className="input" placeholder="Your Full Name" />
                {errors.fullName && <p className="text-red-600 text-xs mt-1">{errors.fullName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input {...register('email')} type="email" className="input" placeholder="Your Email" />
                {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input {...register('phone')} className="input" placeholder="Your Phone Number" />
                {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input {...register('password')} type="password" className="input" placeholder="Min. 6 characters" />
                {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <div className={isVendor ? '' : 'md:col-span-2 md:max-w-sm'}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <input {...register('confirmPassword')} type="password" className="input" placeholder="Repeat password" />
                {errors.confirmPassword && <p className="text-red-600 text-xs mt-1">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            {/* Vendor business fields */}
            {isVendor && (
              <div className="border-t pt-5 space-y-5">
                <h3 className="text-base font-semibold text-gray-800">Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
                    <input {...register('businessName')} className="input" placeholder="Your company name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax ID <span className="text-gray-400 font-normal">(Optional)</span></label>
                    <input {...register('taxId')} className="input" placeholder="PAN / VAT number" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Address</label>
                    <textarea {...register('businessAddress')} className="input" rows={2} placeholder="Street, City, Province" />
                  </div>
                </div>
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Vendor accounts require admin approval before you can start listing products.
                </p>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full btn btn-primary">
              {loading ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
