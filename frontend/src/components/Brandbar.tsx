import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import logo from '@/assets/logo.png';

const Brandbar: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      navigate(`/products?search=${encodeURIComponent(q)}`);
    }
  };

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="container mx-auto px-4 py-3 flex items-center gap-6">
        {/* Logo */}
        <Link to="/" onClick={() => window.scrollTo(0, 0)} className="flex-shrink-0">
          <img
            src={logo}
            alt="JutaGhar"
            className="h-10 w-auto object-contain hover:opacity-90 transition-opacity"
          />
        </Link>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full overflow-hidden focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for shoes, brands, categories…"
              className="flex-1 bg-transparent px-5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
            />
            <button
              type="submit"
              className="flex items-center justify-center px-4 py-2.5 text-gray-500 hover:text-primary-600 transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Brandbar;
