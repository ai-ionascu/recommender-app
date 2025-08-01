import '../App.css';
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ImageUploader from './ImageUploader';
import { validateProductData, normalize } from '../utils/validateProductData.js';

const categoryOptions = ['wine', 'spirits', 'beer', 'accessories'];
const wineTypes = ['red', 'white', 'rose', 'sparkling', 'dessert'];
const spiritTypes = ['whiskey', 'vodka', 'gin', 'rhum', 'tequila', 'brandy'];
const beerStyles = ['lager', 'ipa', 'stout', 'pilsner', 'wheat'];
const accessoryTypes = ['glassware', 'decanter', 'opener', 'gift_set'];
const compatibleTypes = ['wine', 'spirits', 'beer', 'all'];

const ProductForm = ({ formData, onChange, onSubmit, onCancel, productImages,
                    onImagesUpdate, shouldReset, isEditing }) => {

  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {

    const { name, value } = e.target;
    onChange({ ...formData, [name]: value });

    if (name === 'category') {
      onImagesUpdate([]); // reset images when category changes
    }

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

  const renderInput = (label, name, type = 'text') => (
    <div className="mb-4">
      <label htmlFor={name} className="block font-medium">{label}</label>
      <input
        type={type}
        id={name}
        name={name}
        value={formData[name] || ''}
        onChange={handleChange}
        className={`w-full px-3 py-2 border rounded ${formErrors[name] ? 'input-error' : ''}`}
      />
      {formErrors[name] && <p className="text-error mt-1 text-sm">Invalid field</p>}
    </div>
  );

  const renderSelect = (label, name, options) => (
    <div className="mb-4">
      <label htmlFor={name} className="block font-medium">{label}</label>
      <select
        id={name}
        name={name}
        value={formData[name] || ''}
        onChange={handleChange}
        className={`w-full px-3 py-2 border rounded ${formErrors[name] ? 'input-error' : ''}`}
      >
        <option value="">-- Select --</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      {formErrors[name] && <p className="text-error mt-1 text-sm">Invalid field</p>}
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
            {renderInput('Vintage', 'vintage', 'number')}
            {renderInput('Alcohol Content (%)', 'alcohol_content', 'number')}
            {renderInput('Volume (ml)', 'volume_ml', 'number')}
          </>
        );
      case 'spirits':
        return (
          <>
            {renderSelect('Spirit Type', 'spirit_type', spiritTypes)}
            {renderInput('Country', 'country')}
            {renderInput('Distillation Year', 'distillation_year', 'number')}
            {renderInput('Alcohol Content (%)', 'alcohol_content', 'number')}
            {renderInput('Volume (ml)', 'volume_ml', 'number')}
            {renderInput('Age Statement', 'age_statement', 'number')}
          </>
        );
      case 'beer':
        return (
          <>
            {renderSelect('Beer Style', 'style', beerStyles)}
            {renderInput('Country', 'country')}
            {renderInput('IBU', 'ibu', 'number')}
            {renderInput('Brewery', 'brewery')}
            {renderInput('Alcohol Content (%)', 'alcohol_content', 'number')}
            {renderInput('Volume (ml)', 'volume_ml', 'number')}
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
      {renderInput('Name', 'name')}
      {renderSelect('Category', 'category', categoryOptions)}
      {renderInput('Price', 'price', 'number')}
      {renderInput('Stock', 'stock', 'number')}

      {renderCategoryFields()}

      <ImageUploader
        productId={formData.id}
        formData={formData}
        productImages={productImages}
        onImagesUpdate={onImagesUpdate}
        shouldReset={shouldReset}
      />

        <button type="submit" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
            {isEditing ? 'Update Product' : 'Save Product'}
        </button>
        {isEditing && (
            <button
                type="button"
                className="mt-4 ml-2 px-4 py-2 bg-gray-400 text-white rounded"
                onClick={onCancel}
            >
                Cancel
            </button>
        )}
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
  onCancel: PropTypes.func
};

export default ProductForm;
