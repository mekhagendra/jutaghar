import { validationResult } from 'express-validator';
import Category from '../models/Category.js';
import Brand from '../models/Brand.js';
import Product from '../models/Product.js';
import { saveBase64Image } from '../utils/imageStorage.js';
import { asObjectId, asString, stripOperators } from '../utils/sanitizeInput.js';

// ========== CATEGORIES ==========

export const getCategories = async (req, res) => {
  try {
    const safeQuery = stripOperators({ ...req.query });
    const status = safeQuery.status ? asString(safeQuery.status) : '';
    const withInventory = safeQuery.withInventory ? asString(safeQuery.withInventory) : '';
    const gender = safeQuery.gender ? asString(safeQuery.gender) : '';
    const query = {};
    if (status) query.status = status;

    const categories = await Category.find(query).sort('displayOrder name');

    // If withInventory is requested, filter categories that have products with inventory
    if (withInventory === 'true') {
      const categoriesWithInventory = [];
      
      for (const category of categories) {
        const productQuery = {
          category: category._id,
          status: 'active',
          $or: [
            { stock: { $gt: 0 } },
            { 'variants.quantity': { $gt: 0 } }
          ]
        };
        
        // Add gender filter - include unisex products for all genders
        if (gender) {
          // Capitalize first letter to match enum values (Men, Women, Kids, Unisex)
          const normalizedGender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
          productQuery.$and = [
            {
              $or: [
                { gender: normalizedGender },
                { gender: 'Unisex' }
              ]
            }
          ];
        }
        
        const productCount = await Product.countDocuments(productQuery);
        
        if (productCount > 0) {
          categoriesWithInventory.push({
            ...category.toObject(),
            productCount
          });
        }
      }
      
      return res.json({
        success: true,
        data: categoriesWithInventory
      });
    }

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

export const createCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const categoryData = stripOperators({ ...req.body });
    if (categoryData.image) {
      categoryData.image = await saveBase64Image(categoryData.image, 'categories');
    }

    const category = await Category.create(categoryData);

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const updateData = stripOperators({ ...req.body });
    const categoryId = asObjectId(req.params.id);
    if (updateData.image) {
      updateData.image = await saveBase64Image(updateData.image, 'categories');
    }

    const category = await Category.findByIdAndUpdate(
      categoryId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const categoryId = asObjectId(req.params.id);
    const category = await Category.findByIdAndDelete(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

// ========== BRANDS ==========

export const getBrands = async (req, res) => {
  try {
    const safeQuery = stripOperators({ ...req.query });
    const status = safeQuery.status ? asString(safeQuery.status) : '';
    const withInventory = safeQuery.withInventory ? asString(safeQuery.withInventory) : '';
    const query = {};
    if (status) query.status = status;

    const brands = await Brand.find(query).sort('displayOrder name');

    // If withInventory is requested, filter brands that have products with inventory
    if (withInventory === 'true') {
      const brandsWithInventory = [];
      
      for (const brand of brands) {
        const productQuery = {
          brand: brand._id,
          status: 'active',
          $or: [
            { stock: { $gt: 0 } },
            { 'variants.quantity': { $gt: 0 } }
          ]
        };
        
        const productCount = await Product.countDocuments(productQuery);
        
        if (productCount > 0) {
          brandsWithInventory.push({
            ...brand.toObject(),
            productCount
          });
        }
      }
      
      return res.json({
        success: true,
        data: brandsWithInventory
      });
    }

    res.json({
      success: true,
      data: brands
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

export const createBrand = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const brandData = stripOperators({ ...req.body });
    if (brandData.logo) {
      brandData.logo = await saveBase64Image(brandData.logo, 'brands');
    }

    const brand = await Brand.create(brandData);

    res.status(201).json({
      success: true,
      data: brand
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Brand with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

export const updateBrand = async (req, res) => {
  try {
    const updateData = stripOperators({ ...req.body });
    const brandId = asObjectId(req.params.id);
    if (updateData.logo) {
      updateData.logo = await saveBase64Image(updateData.logo, 'brands');
    }

    const brand = await Brand.findByIdAndUpdate(
      brandId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    res.json({
      success: true,
      data: brand
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const brandId = asObjectId(req.params.id);
    const brand = await Brand.findByIdAndDelete(brandId);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    res.json({
      success: true,
      message: 'Brand deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal error', requestId: req.id
    });
  }
};
