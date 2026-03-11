import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';
import { UserPlus } from 'lucide-react';

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

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'user' | 'manufacturer' | 'importer' | 'seller'>('user');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'user',
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setLoading(true);
      setError('');
      await registerUser(data);
      navigate('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full card">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <UserPlus className="w-12 h-12 text-primary-600" />
          </div>
          <h2 className="text-3xl font-bold">Create Account</h2>
          <p className="text-gray-600 mt-2">Join JutaGhar today</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I want to
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => setSelectedRole('user')}
                className={`p-4 border-2 rounded-lg text-left transition ${
                  selectedRole === 'user'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  {...register('role')}
                  type="radio"
                  value="user"
                  className="hidden"
                  checked={selectedRole === 'user'}
                  onChange={() => setSelectedRole('user')}
                />
                <div className="font-semibold text-sm">Customer</div>
                <div className="text-xs text-gray-600">Browse & buy</div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('manufacturer')}
                className={`p-4 border-2 rounded-lg text-left transition ${
                  selectedRole === 'manufacturer'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  {...register('role')}
                  type="radio"
                  value="manufacturer"
                  className="hidden"
                  checked={selectedRole === 'manufacturer'}
                  onChange={() => setSelectedRole('manufacturer')}
                />
                <div className="font-semibold text-sm">Manufacturer</div>
                <div className="text-xs text-gray-600">Produce goods</div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('importer')}
                className={`p-4 border-2 rounded-lg text-left transition ${
                  selectedRole === 'importer'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  {...register('role')}
                  type="radio"
                  value="importer"
                  className="hidden"
                  checked={selectedRole === 'importer'}
                  onChange={() => setSelectedRole('importer')}
                />
                <div className="font-semibold text-sm">Importer</div>
                <div className="text-xs text-gray-600">Import goods</div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('seller')}
                className={`p-4 border-2 rounded-lg text-left transition ${
                  selectedRole === 'seller'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  {...register('role')}
                  type="radio"
                  value="seller"
                  className="hidden"
                  checked={selectedRole === 'seller'}
                  onChange={() => setSelectedRole('seller')}
                />
                <div className="font-semibold text-sm">Seller</div>
                <div className="text-xs text-gray-600">Resell products</div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input {...register('fullName')} className="input" />
              {errors.fullName && (
                <p className="text-red-600 text-sm mt-1">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input {...register('email')} type="email" className="input" />
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input {...register('phone')} className="input" />
              {errors.phone && (
                <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input {...register('password')} type="password" className="input" />
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input {...register('confirmPassword')} type="password" className="input" />
              {errors.confirmPassword && (
                <p className="text-red-600 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {/* Vendor-specific fields */}
          {['manufacturer', 'importer', 'seller'].includes(selectedRole) && (
            <div className="border-t pt-6 space-y-6">
              <h3 className="text-lg font-semibold">Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name
                  </label>
                  <input {...register('businessName')} className="input" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Address
                  </label>
                  <textarea {...register('businessAddress')} className="input" rows={3} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax ID (Optional)
                  </label>
                  <input {...register('taxId')} className="input" />
                </div>
              </div>
              <p className="text-sm text-yellow-600">
                Note: Vendor accounts require admin approval before you can start listing products.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
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
