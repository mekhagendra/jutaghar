import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, X, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

interface HeroSlide {
  _id: string;
  collectionName: string;
  title: string;
  shopNowUrl: string;
  image: string;
  order: number;
  isActive: boolean;
}

interface HeroSlideFormData {
  collectionName: string;
  title: string;
  shopNowUrl: string;
  image: string;
  order: number;
  isActive: boolean;
}

const emptyForm: HeroSlideFormData = {
  collectionName: '',
  title: '',
  shopNowUrl: '',
  image: '',
  order: 0,
  isActive: true,
};

export default function ManageHeroSlides() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState<HeroSlideFormData>(emptyForm);

  const { data: slides, isLoading } = useQuery<HeroSlide[]>({
    queryKey: ['hero-slides-admin'],
    queryFn: async () => {
      const response = await api.get('/api/hero-slides/all');
      return response.data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: HeroSlideFormData) => {
      if (editingSlide) {
        return api.put(`/api/hero-slides/${editingSlide._id}`, data);
      }
      return api.post('/api/hero-slides', data);
    },
    onSuccess: () => {
      toast.success(editingSlide ? 'Hero slide updated!' : 'Hero slide created!');
      queryClient.invalidateQueries({ queryKey: ['hero-slides-admin'] });
      queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
      handleCloseModal();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save hero slide');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/hero-slides/${id}`);
    },
    onSuccess: () => {
      toast.success('Hero slide deleted!');
      queryClient.invalidateQueries({ queryKey: ['hero-slides-admin'] });
      queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to delete hero slide');
    },
  });

  const handleOpenModal = (slide?: HeroSlide) => {
    if (slide) {
      setEditingSlide(slide);
      setFormData({
        collectionName: slide.collectionName,
        title: slide.title,
        shopNowUrl: slide.shopNowUrl,
        image: slide.image,
        order: slide.order,
        isActive: slide.isActive,
      });
      setImagePreview(slide.image);
    } else {
      setEditingSlide(null);
      setFormData(emptyForm);
      setImagePreview('');
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSlide(null);
    setImagePreview('');
    setFormData(emptyForm);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this hero slide?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setFormData((prev) => ({ ...prev, image: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image) {
      toast.error('Please upload an image');
      return;
    }
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Hero Slides</h1>
            <p className="text-gray-600 mt-1">
              Add and manage homepage hero banner slides
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Add Slide
          </button>
        </div>

        {/* Slides table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {slides && slides.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <GripVertical className="h-4 w-4" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Image
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Collection
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Shop Now URL
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {slides.map((slide) => (
                  <tr key={slide._id}>
                    <td className="px-4 py-4 text-gray-400">
                      <span className="text-sm">{slide.order}</span>
                    </td>
                    <td className="px-4 py-4">
                      <img
                        src={slide.image}
                        alt={slide.title}
                        loading="lazy"
                        decoding="async"
                        className="h-16 w-28 object-cover rounded"
                      />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                      {slide.collectionName}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">{slide.title}</td>
                    <td className="px-4 py-4 text-sm text-blue-600 max-w-[200px] truncate">
                      <a
                        href={slide.shopNowUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {slide.shopNowUrl}
                      </a>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          slide.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {slide.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenModal(slide)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                        aria-label="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(slide._id)}
                        className="text-red-600 hover:text-red-900"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center text-gray-500">
              No hero slides yet. Click "Add Slide" to create one.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingSlide ? 'Edit Hero Slide' : 'Add Hero Slide'}
              </h2>
              <button onClick={handleCloseModal} aria-label="Close">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hero Image *
                </label>
                {imagePreview && (
                  <div className="mb-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      loading="lazy"
                      decoding="async"
                      className="h-40 w-full object-cover rounded border"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended size: 1920×600px (wide banner)
                </p>
              </div>

              {/* Collection Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collection Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer Collection 2025"
                  value={formData.collectionName}
                  onChange={(e) =>
                    setFormData({ ...formData, collectionName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Shown as the subtitle above the main title
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Step Into Style"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Large heading displayed on the hero banner
                </p>
              </div>

              {/* Shop Now URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shop Now URL *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. /products?category=summer"
                  value={formData.shopNowUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, shopNowUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Path or URL the "Shop Now" button links to
                </p>
              </div>

              {/* Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.order}
                  onChange={(e) =>
                    setFormData({ ...formData, order: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower numbers appear first
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active (visible on homepage)
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Slide'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
