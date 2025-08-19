import { normalizeBody } from './normalize.js';

function collectValidationErrors(data, opts = {}) {
  const { partial = false } = opts;
  const errors = {};

  // common fields
  if (partial) {
    if ('name' in data && !data.name) errors.name = true;
    if ('category' in data && !['wine','spirits','beer','accessories'].includes(data.category)) errors.category = true;

    if ('price' in data && (data.price == null || isNaN(Number(data.price)) || Number(data.price) < 0)) errors.price = true;
    if ('stock' in data) {
      const stockNum = Number(data.stock);
      if (data.stock == null || isNaN(stockNum) || stockNum < 0) errors.stock = true;
    }
  } else {
    if (!data.name) errors.name = true;
    if (!data.category || !['wine','spirits','beer','accessories'].includes(data.category)) errors.category = true;

    if (data.price == null || isNaN(Number(data.price)) || Number(data.price) < 0) errors.price = true;
    const stockNum = Number(data.stock);
    if (data.stock == null || isNaN(stockNum) || stockNum < 0) errors.stock = true;
  }

  // category-specific
  if (!partial) {
    switch (data.category) {
      case 'wine':
        if (!data.wine_type || !['red','white','rose','sparkling','dessert'].includes(data.wine_type)) errors.wine_type = true;
        if (!data.country) errors.country = true;
        if (!data.grape_variety) errors.grape_variety = true;
        if (data.vintage && (isNaN(data.vintage) || data.vintage < 1900 || data.vintage > new Date().getFullYear() + 2)) errors.vintage = true;
        if (data.alcohol_content && (isNaN(data.alcohol_content) || data.alcohol_content < 0 || data.alcohol_content > 80)) errors.alcohol_content = true;
        if (data.volume_ml && (isNaN(data.volume_ml) || data.volume_ml < 0 || data.volume_ml > 5000)) errors.volume_ml = true;
        break;
      case 'spirits':
        if (!data.spirit_type || !['whiskey','vodka','gin','rhum','tequila','brandy'].includes(data.spirit_type)) errors.spirit_type = true;
        if (!data.country) errors.country = true;
        if (data.distillation_year && (isNaN(data.distillation_year) || data.distillation_year < 1900 || data.distillation_year > new Date().getFullYear() - 5)) errors.distillation_year = true;
        if (data.alcohol_content && (isNaN(data.alcohol_content) || data.alcohol_content < 0 || data.alcohol_content > 80)) errors.alcohol_content = true;
        if (data.volume_ml && (isNaN(data.volume_ml) || data.volume_ml < 0 || data.volume_ml > 5000)) errors.volume_ml = true;
        if (data.age_statement && (isNaN(data.age_statement) || data.age_statement < 0 || data.age_statement > 100)) errors.age_statement = true;
        break;
      case 'beer':
        if (!data.style || !['lager','ipa','stout','pilsner','wheat'].includes(data.style)) errors.style = true;
        if (!data.country) errors.country = true;
        if (data.ibu && (isNaN(data.ibu) || data.ibu < 0 || data.ibu > 100)) errors.ibu = true;
        if (!data.brewery) errors.brewery = true;
        if (data.alcohol_content && (isNaN(data.alcohol_content) || data.alcohol_content < 0 || data.alcohol_content > 80)) errors.alcohol_content = true;
        if (data.volume_ml && (isNaN(data.volume_ml) || data.volume_ml < 0 || data.volume_ml > 5000)) errors.volume_ml = true;
        break;
      case 'accessories':
        if (!data.accessory_type || !['glassware','decanter','opener','gift_set'].includes(data.accessory_type)) errors.accessory_type = true;
        if (!data.compatible_with_product_type || !['wine','spirits','beer','all'].includes(data.compatible_with_product_type)) errors.compatible_with_product_type = true;
        break;
    }
  } else {
    switch (data.category) {
      case 'wine':
        if ('wine_type' in data && !['red','white','rose','sparkling','dessert'].includes(data.wine_type)) errors.wine_type = true;
        if ('country' in data && !data.country) errors.country = true;
        if ('grape_variety' in data && !data.grape_variety) errors.grape_variety = true;
        if ('vintage' in data && (isNaN(data.vintage) || data.vintage < 1900 || data.vintage > new Date().getFullYear() + 2)) errors.vintage = true;
        if ('alcohol_content' in data && (isNaN(data.alcohol_content) || data.alcohol_content < 0 || data.alcohol_content > 80)) errors.alcohol_content = true;
        if ('volume_ml' in data && (isNaN(data.volume_ml) || data.volume_ml < 0 || data.volume_ml > 5000)) errors.volume_ml = true;
        break;
      case 'spirits':
        if ('spirit_type' in data && !['whiskey','vodka','gin','rhum','tequila','brandy'].includes(data.spirit_type)) errors.spirit_type = true;
        if ('country' in data && !data.country) errors.country = true;
        if ('distillation_year' in data && (isNaN(data.distillation_year) || data.distillation_year < 1900 || data.distillation_year > new Date().getFullYear() - 5)) errors.distillation_year = true;
        if ('alcohol_content' in data && (isNaN(data.alcohol_content) || data.alcohol_content < 0 || data.alcohol_content > 80)) errors.alcohol_content = true;
        if ('volume_ml' in data && (isNaN(data.volume_ml) || data.volume_ml < 0 || data.volume_ml > 5000)) errors.volume_ml = true;
        if ('age_statement' in data && (isNaN(data.age_statement) || data.age_statement < 0 || data.age_statement > 100)) errors.age_statement = true;
        break;
      case 'beer':
        if ('style' in data && !['lager','ipa','stout','pilsner','wheat'].includes(data.style)) errors.style = true;
        if ('country' in data && !data.country) errors.country = true;
        if ('ibu' in data && (isNaN(data.ibu) || data.ibu < 0 || data.ibu > 100)) errors.ibu = true;
        if ('brewery' in data && !data.brewery) errors.brewery = true;
        if ('alcohol_content' in data && (isNaN(data.alcohol_content) || data.alcohol_content < 0 || data.alcohol_content > 80)) errors.alcohol_content = true;
        if ('volume_ml' in data && (isNaN(data.volume_ml) || data.volume_ml < 0 || data.volume_ml > 5000)) errors.volume_ml = true;
        break;
      case 'accessories':
        if ('accessory_type' in data && !['glassware','decanter','opener','gift_set'].includes(data.accessory_type)) errors.accessory_type = true;
        if ('compatible_with_product_type' in data && !['wine','spirits','beer','all'].includes(data.compatible_with_product_type)) errors.compatible_with_product_type = true;
        break;
      default:
        // no category in body => no specific fields required
        break;
    }
  }

  return errors;
}

// create
export function validateProduct(req, res, next) {
  req.body = normalizeBody(req.body);
  const errors = collectValidationErrors(req.body, { partial: false });
  if (Object.keys(errors).length) return res.status(400).json({ errors });
  next();
}

// update (partial)
export function validateProductUpdate(req, res, next) {
  req.body = normalizeBody(req.body);
  const errors = collectValidationErrors(req.body, { partial: true });
  if (Object.keys(errors).length) return res.status(400).json({ errors });
  next();
}