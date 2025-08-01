export function normalize(data) {
  const normalized = {};
  for (const key in data) {
    normalized[key] = data[key] === '' ? undefined : data[key];
  }
  return normalized;
}


// Validation function for product data
export function validateProductData(data) {
  const errors = {};

  // common fields
  if (!data.name) errors.name = true;
  if (!data.category || !['wine', 'spirits', 'beer', 'accessories'].includes(data.category)) errors.category = true;
  if (!data.price || isNaN(data.price) || data.price < 0) errors.price = true;
  const stockNum = Number(data.stock);
  if (data.stock == null || isNaN(stockNum) || stockNum < 0) errors.stock = true;


  // per category
  switch (data.category) {
    case 'wine':
      if (!data.wine_type || !['red', 'white', 'rose', 'sparkling', 'dessert'].includes(data.wine_type)) {errors.wine_type = true;
        console.error('Invalid wine type:', data.wine_type); // debugging line
      }
      if (!data.country) errors.country = true;
      if (!data.grape_variety) errors.grape_variety = true;
      if (data.vintage && (isNaN(data.vintage) || data.vintage < 1900 || data.vintage > new Date().getFullYear() + 2)) errors.vintage = true;
      if (data.alcohol_content && (isNaN(data.alcohol_content) || data.alcohol_content < 0 || data.alcohol_content > 80)) errors.alcohol_content = true;
      if (data.volume_ml && (isNaN(data.volume_ml) || data.volume_ml < 0 || data.volume_ml > 5000)) errors.volume_ml = true;
      break;

    case 'spirits':
      if (!data.spirit_type || !['whiskey', 'vodka', 'gin', 'rhum', 'tequila', 'brandy'].includes(data.spirit_type)) errors.spirit_type = true;
      if (!data.country) errors.country = true;
      if (data.distillation_year && (isNaN(data.distillation_year) || data.distillation_year < 1900 || data.distillation_year > new Date().getFullYear() - 5)) errors.distillation_year = true;
      if (data.alcohol_content && (isNaN(data.alcohol_content) || data.alcohol_content < 0 || data.alcohol_content > 80)) errors.alcohol_content = true;
      if (data.volume_ml && (isNaN(data.volume_ml) || data.volume_ml < 0 || data.volume_ml > 5000)) errors.volume_ml = true;
      if (data.age_statement && (isNaN(data.age_statement) || data.age_statement < 0 || data.age_statement > 100)) errors.age_statement = true;
      break;

    case 'beer':
      if (!data.style || !['lager', 'ipa', 'stout', 'pilsner', 'wheat'].includes(data.style)) errors.style = true;
      if (!data.country) errors.country = true;
      if (data.ibu && (isNaN(data.ibu) || data.ibu < 0 || data.ibu > 100)) errors.ibu = true;
      if (!data.brewery) errors.brewery = true;
      if (data.alcohol_content && (isNaN(data.alcohol_content) || data.alcohol_content < 0 || data.alcohol_content > 80)) errors.alcohol_content = true;
      if (data.volume_ml && (isNaN(data.volume_ml) || data.volume_ml < 0 || data.volume_ml > 5000)) errors.volume_ml = true;
      break;

    case 'accessories':
      if (!data.accessory_type || !['glassware', 'decanter', 'opener', 'gift_set'].includes(data.accessory_type)) errors.accessory_type = true;
      if (!data.compatible_with_product_type || !['wine', 'spirits', 'beer', 'all'].includes(data.compatible_with_product_type)) errors.compatible_with_product_type = true;
      break;

    default:
      errors.category = true;
  }

  return errors;
}
