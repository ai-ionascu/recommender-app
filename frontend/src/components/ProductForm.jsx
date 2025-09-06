// frontend/src/components/ProductForm.jsx
import '../App.css';
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ImageUploader from './ImageUploader';
import { validateProductData, normalize } from '../utils/validateProductData.js';

const categoryOptions = ['wine', 'spirits', 'beer', 'accessories'];
const wineTypes       = ['red', 'white', 'rose', 'sparkling', 'dessert'];
const spiritTypes     = ['whiskey', 'vodka', 'gin', 'rhum', 'tequila', 'brandy'];
const beerStyles      = ['lager', 'ipa', 'stout', 'pilsner', 'wheat'];
const accessoryTypes  = ['glassware', 'decanter', 'opener', 'gift_set'];
const compatibleTypes = ['wine', 'spirits', 'beer', 'all'];

/** Which fields are required */
const REQUIRED_COMMON = ['name', 'category', 'price', 'stock'];
const REQUIRED_BY_CATEGORY = {
  wine: ['wine_type', 'country', 'grape_variety'],
  spirits: ['spirit_type', 'country'],
  beer: ['style', 'country', 'brewery'],
  accessories: ['accessory_type', 'compatible_with_product_type'],
};

const ProductForm = ({
  formData,
  onChange,
  onSubmit,
  onCancel,
  productImages,
  onImagesUpdate,
  shouldReset,
  isEditing,
}) => {
  const [formErrors, setFormErrors] = useState({});

  /** Returns whether a field is required given current category */
  const isRequired = (name) => {
    if (REQUIRED_COMMON.includes(name)) return true;
    const cat = formData?.category;
    if (!cat) return false;
    return (REQUIRED_BY_CATEGORY[cat] || []).includes(name);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // When changing category, clear category-specific fields
    if (name === 'category') {
      onImagesUpdate([]); // reset images when category changes
      const cleared = { ...formData, [name]: value };
      Object.values(REQUIRED_BY_CATEGORY).flat().forEach((k) => {
        if (k !== 'category') cleared[k] = undefined;
      });
      onChange(cleared);
      return;
    }

    onChange({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalized = normalize(formData);
    const errors = validateProductData(normalized);
    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      onSubmit({ ...normalized, images: productImages });
    }
  };

  /** Label with asterisk when required */
  const labelWithStar = (label, name) => (
    <span>
      {label}
      {isRequired(name) && <span className="text-red-600 ml-0.5" aria-hidden="true">*</span>}
    </span>
  );

  const renderInput = (label, name, type = 'text', extraProps = {}) => (
    <div className="mb-4">
      <label htmlFor={name} className="block font-medium">
        {labelWithStar(label, name)}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={formData[name] ?? ''}
        onChange={handleChange}
        required={isRequired(name)}
        aria-required={isRequired(name)}
        className={`w-full px-3 py-2 border rounded ${formErrors[name] ? 'input-error' : ''}`}
        {...extraProps}
      />
      {formErrors[name] && (
        <p className="text-error mt-1 text-sm">Required or invalid value</p>
      )}
    </div>
  );

  const renderSelect = (label, name, options) => (
    <div className="mb-4">
      <label htmlFor={name} className="block font-medium">
        {labelWithStar(label, name)}
      </label>
      <select
        id={name}
        name={name}
        value={formData[name] ?? ''}
        onChange={handleChange}
        required={isRequired(name)}
        aria-required={isRequired(name)}
        className={`w-full px-3 py-2 border rounded ${formErrors[name] ? 'input-error' : ''}`}
      >
        <option value="">-- Select --</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {formErrors[name] && (
        <p className="text-error mt-1 text-sm">Required or invalid value</p>
      )}
    </div>
  );

  const renderCategoryFields = () => {
    switch (formData.category) {
      case 'wine':
        return (
          <>
            {renderSelect('Wine Type', 'wine_type', wineTypes)}
            {renderInput('Grape Variety', 'grape_variety')}
            {renderInput('Country', 'country')}
            {renderInput('Vintage', 'vintage', 'number', { min: 1900, max: new Date().getFullYear() + 2 })}
            {renderInput('Alcohol Content (%)', 'alcohol_content', 'number', { min: 0, max: 80, step: '0.1' })}
            {renderInput('Volume (ml)', 'volume_ml', 'number', { min: 0, max: 5000, step: '1' })}
          </>
        );
      case 'spirits':
        return (
          <>
            {renderSelect('Spirit Type', 'spirit_type', spiritTypes)}
            {renderInput('Country', 'country')}
            {renderInput('Distillation Year', 'distillation_year', 'number', { min: 1900, max: new Date().getFullYear() - 5 })}
            {renderInput('Alcohol Content (%)', 'alcohol_content', 'number', { min: 0, max: 80, step: '0.1' })}
            {renderInput('Volume (ml)', 'volume_ml', 'number', { min: 0, max: 5000, step: '1' })}
            {renderInput('Age Statement', 'age_statement', 'number', { min: 0, max: 100 })}
          </>
        );
      case 'beer':
        return (
          <>
            {renderSelect('Beer Style', 'style', beerStyles)}
            {renderInput('Country', 'country')}
            {renderInput('IBU', 'ibu', 'number', { min: 0, max: 100 })}
            {renderInput('Brewery', 'brewery')}
            {renderInput('Alcohol Content (%)', 'alcohol_content', 'number', { min: 0, max: 80, step: '0.1' })}
            {renderInput('Volume (ml)', 'volume_ml', 'number', { min: 0, max: 5000, step: '1' })}
          </>
        );
      case 'accessories':
        return (
          <>
            {renderSelect('Accessory Type', 'accessory_type', accessoryTypes)}
            {renderSelect('Compatible With', 'compatible_with_product_type', compatibleTypes)}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4">
      <div className="text-sm text-gray-500 mb-3">
        <span className="text-red-600">*</span> required
      </div>

      {renderInput('Name', 'name')}
      {renderSelect('Category', 'category', categoryOptions)}
      {renderInput('Price', 'price', 'number', { min: 0, step: '0.01', inputMode: 'decimal' })}
      {renderInput('Stock', 'stock', 'number', { min: 0, step: '1', inputMode: 'numeric' })}

      {renderCategoryFields()}

      <ImageUploader
        productId={formData.id}
        formData={formData}
        productImages={productImages}
        onImagesUpdate={onImagesUpdate}
        shouldReset={shouldReset}
      />

      <div className="mt-4 flex items-center gap-2">
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
          {isEditing ? 'Update Product' : 'Save Product'}
        </button>
        {isEditing && (
          <button
            type="button"
            className="px-4 py-2 bg-gray-400 text-white rounded"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

ProductForm.propTypes = {
  initialData: PropTypes.object,
  formData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onImagesUpdate: PropTypes.func.isRequired,
  shouldReset: PropTypes.bool,
  isEditing: PropTypes.bool,
  onCancel: PropTypes.func,
};

export default ProductForm;
