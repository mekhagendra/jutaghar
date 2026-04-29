import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Phone, Mail, Store, Search } from 'lucide-react';
import api from '@/lib/api';

interface Vendor {
  _id: string;
  businessName: string;
  fullName: string;
  email: string;
  phone: string;
  businessAddress?: string;
  sellerImage?: string;
  role: string;
}

const Outlets: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['outlets'],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('isApproved', 'true');
      const response = await api.get(`/api/outlets?${params.toString()}`);
      return response.data.data;
    },
  });

  const vendors = data?.vendors || [];

  const filteredVendors = vendors.filter((vendor: Vendor) =>
    vendor.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.businessAddress?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Outlets</h1>
          <p className="text-xl text-primary-100 max-w-2xl">
            Discover our network of trusted outlets across the region
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No outlets found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-4">
              <p className="text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredVendors.length}</span> {filteredVendors.length === 1 ? 'outlet' : 'outlets'}
              </p>
            </div>

            {/* Outlets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredVendors.map((vendor: Vendor) => (
                  <div
                    key={vendor._id}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-200 group"
                  >
                    <div className="p-5 flex flex-col sm:flex-row sm:items-stretch gap-4">
                      <div className="w-full sm:w-52 shrink-0 aspect-video overflow-hidden rounded-lg border border-gray-200">
                        {vendor.sellerImage ? (
                          <img
                            src={vendor.sellerImage}
                            alt={vendor.businessName || vendor.fullName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-primary-50 border border-primary-100 flex items-center justify-center">
                            <Store className="w-10 h-10 text-primary-600" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div>
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition mb-3">
                          {vendor.businessName || vendor.fullName}
                        </h3>

                        <div className="space-y-2 mb-4">
                        {vendor.businessAddress && (
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                            <span>{vendor.businessAddress}</span>
                          </div>
                        )}
                        {vendor.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span>{vendor.phone}</span>
                          </div>
                        )}
                        {vendor.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{vendor.email}</span>
                          </div>
                        )}
                        </div>

                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Outlets;
