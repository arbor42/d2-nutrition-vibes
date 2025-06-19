/**
 * Product mappings for German translations and enhanced product selection
 * Maps English FAO product names to German names and provides additional metadata
 * Updated with exact FAO metadata product names (113 products total)
 * Now includes ML forecast product name mappings
 */

export const productMappings = {
  // Cereals & Grains
  'Animal fats': 'Tierische Fette',
  'Barley and products': 'Gerste und Erzeugnisse',
  'Beer': 'Bier',
  'Cereals - Excluding Beer': 'Getreide - Ohne Bier',
  'Cereals, other': 'Getreide, andere',
  'Maize and products': 'Mais und Erzeugnisse',
  'Millet and products': 'Hirse und Erzeugnisse',
  'Oats': 'Hafer',
  'Rice and products': 'Reis und Erzeugnisse',
  'Rye and products': 'Roggen und Erzeugnisse',
  'Sorghum and products': 'Sorghum und Erzeugnisse',
  'Wheat and products': 'Weizen und Erzeugnisse',

  // Fruits
  'Apples and products': 'Äpfel und Erzeugnisse',
  'Bananas': 'Bananen',
  'Citrus, Other': 'Zitrusfrüchte, andere',
  'Dates': 'Datteln',
  'Fruits - Excluding Wine': 'Früchte - Ohne Wein',
  'Fruits, other': 'Früchte, andere',
  'Grapefruit and products': 'Grapefruit und Erzeugnisse',
  'Grapes and products (excl wine)': 'Trauben und Erzeugnisse (ohne Wein)',
  'Lemons, Limes and products': 'Zitronen, Limetten und Erzeugnisse',
  'Oranges, Mandarines': 'Orangen, Mandarinen',
  'Pineapples and products': 'Ananas und Erzeugnisse',

  // Vegetables & Roots
  'Cassava and products': 'Maniok und Erzeugnisse',
  'Onions': 'Zwiebeln',
  'Plantains': 'Kochbananen',
  'Potatoes and products': 'Kartoffeln und Erzeugnisse',
  'Roots, Other': 'Wurzeln, andere',
  'Starchy Roots': 'Stärkehaltige Wurzeln',
  'Sweet potatoes': 'Süßkartoffeln',
  'Tomatoes and products': 'Tomaten und Erzeugnisse',
  'Vegetables': 'Gemüse',
  'Vegetables, other': 'Gemüse, andere',
  'Yams': 'Yams',

  // Legumes & Nuts
  'Beans': 'Bohnen',
  'Groundnuts': 'Erdnüsse',
  'Nuts and products': 'Nüsse und Erzeugnisse',
  'Peas': 'Erbsen',
  'Pulses': 'Hülsenfrüchte',
  'Pulses, Other and products': 'Hülsenfrüchte, andere und Erzeugnisse',
  'Treenuts': 'Baumnüsse',

  // Meat & Animal Products
  'Bovine Meat': 'Rindfleisch',
  'Butter, Ghee': 'Butter, Ghee',
  'Cream': 'Sahne',
  'Eggs': 'Eier',
  'Meat': 'Fleisch',
  'Meat, Aquatic Mammals': 'Fleisch von Wassersäugetieren',
  'Meat, Other': 'Fleisch, andere',
  'Milk - Excluding Butter': 'Milch - Ohne Butter',
  'Mutton & Goat Meat': 'Hammel- und Ziegenfleisch',
  'Offals': 'Innereien',
  'Offals, Edible': 'Innereien, essbar',
  'Pigmeat': 'Schweinefleisch',
  'Poultry Meat': 'Geflügelfleisch',

  // Fish & Seafood
  'Aquatic Animals, Others': 'Wassertiere, andere',
  'Aquatic Plants': 'Wasserpflanzen',
  'Aquatic Products, Other': 'Wasserprodukte, andere',
  'Cephalopods': 'Kopffüßer',
  'Crustaceans': 'Krebstiere',
  'Demersal Fish': 'Bodenfische',
  'Fish, Body Oil': 'Fischkörperöl',
  'Fish, Liver Oil': 'Fischleberöl',
  'Fish, Seafood': 'Fisch, Meeresfrüchte',
  'Freshwater Fish': 'Süßwasserfische',
  'Marine Fish, Other': 'Meeresfische, andere',
  'Molluscs, Other': 'Weichtiere, andere',
  'Pelagic Fish': 'Pelagische Fische',

  // Oils & Fats
  'Coconut Oil': 'Kokosöl',
  'Cottonseed Oil': 'Baumwollsamenöl',
  'Fats, Animals, Raw': 'Tierische Fette, roh',
  'Groundnut Oil': 'Erdnussöl',
  'Maize Germ Oil': 'Maiskeimöl',
  'Oilcrops': 'Ölsaaten',
  'Oilcrops Oil, Other': 'Ölsaatenöl, andere',
  'Oilcrops, Other': 'Ölsaaten, andere',
  'Olive Oil': 'Olivenöl',
  'Olives (including preserved)': 'Oliven (einschließlich konservierte)',
  'Palm Oil': 'Palmöl',
  'Palmkernel Oil': 'Palmkernöl',
  'Rape and Mustard Oil': 'Raps- und Senföl',
  'Ricebran Oil': 'Reiskleieöl',
  'Sesameseed Oil': 'Sesamöl',
  'Soyabean Oil': 'Sojaöl',
  'Sunflowerseed Oil': 'Sonnenblumenöl',
  'Vegetable Oils': 'Pflanzenöle',

  // Seeds & Commodities
  'Cloves': 'Nelken',
  'Cocoa Beans and products': 'Kakaobohnen und Erzeugnisse',
  'Coffee and products': 'Kaffee und Erzeugnisse',
  'Cottonseed': 'Baumwollsamen',
  'Palm kernels': 'Palmkerne',
  'Pepper': 'Pfeffer',
  'Pimento': 'Piment',
  'Rape and Mustardseed': 'Raps- und Senfsamen',
  'Sesame seed': 'Sesamsamen',
  'Soyabeans': 'Sojabohnen',
  'Spices': 'Gewürze',
  'Spices, Other': 'Gewürze, andere',
  'Stimulants': 'Stimulanzien',
  'Sunflower seed': 'Sonnenblumenkerne',
  'Tea (including mate)': 'Tee (einschließlich Mate)',

  // Sugar & Sweeteners
  'Beverages, Fermented': 'Fermentierte Getränke',
  'Honey': 'Honig',
  'Sugar & Sweeteners': 'Zucker und Süßstoffe',
  'Sugar (Raw Equivalent)': 'Zucker (Rohzuckeräquivalent)',
  'Sugar Crops': 'Zuckerpflanzen',
  'Sugar beet': 'Zuckerrüben',
  'Sugar cane': 'Zuckerrohr',
  'Sugar non-centrifugal': 'Zucker, nicht zentrifugiert',
  'Sweeteners, Other': 'Süßstoffe, andere',
  'Wine': 'Wein',

  // Other Categories
  'Coconuts - Incl Copra': 'Kokosnüsse - Inkl. Kopra',
  'Infant food': 'Säuglingsnahrung',
  'Miscellaneous': 'Verschiedenes',

  // ML Forecast specific product mappings (using underscores as in filenames)
  'animal_fats': 'Tierische Fette',
  'apples_and_products': 'Äpfel und Erzeugnisse',
  'aquatic_animals_others': 'Wassertiere, andere',
  'aquatic_plants': 'Wasserpflanzen',
  'aquatic_products_other': 'Wasserprodukte, andere',
  'bananas': 'Bananen',
  'barley_and_products': 'Gerste und Erzeugnisse',
  'beans': 'Bohnen',
  'beer': 'Bier',
  'beverages_fermented': 'Fermentierte Getränke',
  'bovine_meat': 'Rindfleisch',
  'butter_ghee': 'Butter, Ghee',
  'cassava_and_products': 'Maniok und Erzeugnisse',
  'cephalopods': 'Kopffüßer',
  'cereals___excluding_beer': 'Getreide - Ohne Bier',
  'cereals_other': 'Getreide, andere',
  'citrus_other': 'Zitrusfrüchte, andere',
  'cloves': 'Nelken',
  'cocoa_beans_and_products': 'Kakaobohnen und Erzeugnisse',
  'coconut_oil': 'Kokosöl',
  'coconuts___incl_copra': 'Kokosnüsse - Inkl. Kopra',
  'coffee_and_products': 'Kaffee und Erzeugnisse',
  'cottonseed': 'Baumwollsamen',
  'cottonseed_oil': 'Baumwollsamenöl',
  'cream': 'Sahne',
  'crustaceans': 'Krebstiere',
  'dates': 'Datteln',
  'demersal_fish': 'Bodenfische',
  'eggs': 'Eier',
  'fats_animals_raw': 'Tierische Fette, roh',
  'fish_body_oil': 'Fischkörperöl',
  'fish_liver_oil': 'Fischleberöl',
  'fish_seafood': 'Fisch, Meeresfrüchte',
  'freshwater_fish': 'Süßwasserfische',
  'fruits___excluding_wine': 'Früchte - Ohne Wein',
  'fruits_other': 'Früchte, andere',
  'grapefruit_and_products': 'Grapefruit und Erzeugnisse',
  'grapes_and_products_excl_wine': 'Trauben und Erzeugnisse (ohne Wein)',
  'groundnut_oil': 'Erdnussöl',
  'groundnuts': 'Erdnüsse',
  'honey': 'Honig',
  'lemons_limes_and_products': 'Zitronen, Limetten und Erzeugnisse',
  'maize_and_products': 'Mais und Erzeugnisse',
  'maize_germ_oil': 'Maiskeimöl',
  'marine_fish_other': 'Meeresfische, andere',
  'meat': 'Fleisch',
  'meat_other': 'Fleisch, andere',
  'milk___excluding_butter': 'Milch - Ohne Butter',
  'millet_and_products': 'Hirse und Erzeugnisse',
  'miscellaneous': 'Verschiedenes',
  'molluscs_other': 'Weichtiere, andere',
  'mutton_&_goat_meat': 'Hammel- und Ziegenfleisch',
  'nuts_and_products': 'Nüsse und Erzeugnisse',
  'oats': 'Hafer',
  'offals': 'Innereien',
  'offals_edible': 'Innereien, essbar',
  'oilcrops': 'Ölsaaten',
  'oilcrops_oil_other': 'Ölsaatenöl, andere',
  'oilcrops_other': 'Ölsaaten, andere',
  'olive_oil': 'Olivenöl',
  'olives_including_preserved': 'Oliven (einschließlich konservierte)',
  'onions': 'Zwiebeln',
  'oranges_mandarines': 'Orangen, Mandarinen',
  'palm_kernels': 'Palmkerne',
  'palm_oil': 'Palmöl',
  'palmkernel_oil': 'Palmkernöl',
  'peas': 'Erbsen',
  'pelagic_fish': 'Pelagische Fische',
  'pepper': 'Pfeffer',
  'pigmeat': 'Schweinefleisch',
  'pimento': 'Piment',
  'pineapples_and_products': 'Ananas und Erzeugnisse',
  'plantains': 'Kochbananen',
  'potatoes_and_products': 'Kartoffeln und Erzeugnisse',
  'poultry_meat': 'Geflügelfleisch',
  'pulses': 'Hülsenfrüchte',
  'pulses_other_and_products': 'Hülsenfrüchte, andere und Erzeugnisse',
  'rape_and_mustard_oil': 'Raps- und Senföl',
  'rape_and_mustardseed': 'Raps- und Senfsamen',
  'rice_and_products': 'Reis und Erzeugnisse',
  'ricebran_oil': 'Reiskleieöl',
  'roots_other': 'Wurzeln, andere',
  'rye_and_products': 'Roggen und Erzeugnisse',
  'sesame_seed': 'Sesamsamen',
  'sesameseed_oil': 'Sesamöl',
  'sorghum_and_products': 'Sorghum und Erzeugnisse',
  'soyabean_oil': 'Sojaöl',
  'soyabeans': 'Sojabohnen',
  'spices': 'Gewürze',
  'spices_other': 'Gewürze, andere',
  'starchy_roots': 'Stärkehaltige Wurzeln',
  'stimulants': 'Stimulanzien',
  'sugar_&_sweeteners': 'Zucker und Süßstoffe',
  'sugar_beet': 'Zuckerrüben',
  'sugar_cane': 'Zuckerrohr',
  'sugar_crops': 'Zuckerpflanzen',
  'sugar_non_centrifugal': 'Zucker, nicht zentrifugiert',
  'sugar_raw_equivalent': 'Zucker (Rohzuckeräquivalent)',
  'sunflower_seed': 'Sonnenblumenkerne',
  'sunflowerseed_oil': 'Sonnenblumenöl',
  'sweet_potatoes': 'Süßkartoffeln',
  'sweeteners_other': 'Süßstoffe, andere',
  'tea_including_mate': 'Tee (einschließlich Mate)',
  'tomatoes_and_products': 'Tomaten und Erzeugnisse',
  'treenuts': 'Baumnüsse',
  'vegetable_oils': 'Pflanzenöle',
  'vegetables': 'Gemüse',
  'vegetables_other': 'Gemüse, andere',
  'wheat_and_products': 'Weizen und Erzeugnisse',
  'wine': 'Wein',
  'yams': 'Yams'
}

/**
 * Product categories for grouping and filtering
 */
export const productCategories = {
  'cereals': {
    name: 'Getreide und Körner',
    icon: '🌾',
    products: [
      'Barley and products', 'Beer', 'Cereals - Excluding Beer', 'Cereals, other',
      'Maize and products', 'Millet and products', 'Oats', 'Rice and products',
      'Rye and products', 'Sorghum and products', 'Wheat and products'
    ]
  },
  'fruits': {
    name: 'Früchte',
    icon: '🍎',
    products: [
      'Apples and products', 'Bananas', 'Citrus, Other', 'Dates',
      'Fruits - Excluding Wine', 'Fruits, other', 'Grapefruit and products',
      'Grapes and products (excl wine)', 'Lemons, Limes and products',
      'Oranges, Mandarines', 'Pineapples and products'
    ]
  },
  'vegetables': {
    name: 'Gemüse und Wurzeln',
    icon: '🥕',
    products: [
      'Cassava and products', 'Onions', 'Plantains', 'Potatoes and products',
      'Roots, Other', 'Starchy Roots', 'Sweet potatoes', 'Tomatoes and products',
      'Vegetables', 'Vegetables, other', 'Yams'
    ]
  },
  'legumes': {
    name: 'Hülsenfrüchte und Nüsse',
    icon: '🥜',
    products: [
      'Beans', 'Groundnuts', 'Nuts and products', 'Peas', 'Pulses',
      'Pulses, Other and products', 'Treenuts'
    ]
  },
  'meat': {
    name: 'Fleisch und Tierprodukte',
    icon: '🥩',
    products: [
      'Bovine Meat', 'Butter, Ghee', 'Cream', 'Eggs', 'Meat', 'Meat, Aquatic Mammals',
      'Meat, Other', 'Milk - Excluding Butter', 'Mutton & Goat Meat', 'Offals',
      'Offals, Edible', 'Pigmeat', 'Poultry Meat'
    ]
  },
  'seafood': {
    name: 'Fisch und Meeresfrüchte',
    icon: '🐟',
    products: [
      'Aquatic Animals, Others', 'Aquatic Plants', 'Aquatic Products, Other',
      'Cephalopods', 'Crustaceans', 'Demersal Fish', 'Fish, Body Oil',
      'Fish, Liver Oil', 'Fish, Seafood', 'Freshwater Fish', 'Marine Fish, Other',
      'Molluscs, Other', 'Pelagic Fish'
    ]
  },
  'oils': {
    name: 'Öle und Fette',
    icon: '🫒',
    products: [
      'Animal fats', 'Coconut Oil', 'Cottonseed Oil', 'Fats, Animals, Raw',
      'Groundnut Oil', 'Maize Germ Oil', 'Oilcrops', 'Oilcrops Oil, Other',
      'Oilcrops, Other', 'Olive Oil', 'Olives (including preserved)', 'Palm Oil',
      'Palmkernel Oil', 'Rape and Mustard Oil', 'Ricebran Oil', 'Sesameseed Oil',
      'Soyabean Oil', 'Sunflowerseed Oil', 'Vegetable Oils'
    ]
  },
  'seeds': {
    name: 'Samen und Rohstoffe',
    icon: '🌱',
    products: [
      'Cloves', 'Cocoa Beans and products', 'Coffee and products', 'Cottonseed',
      'Palm kernels', 'Pepper', 'Pimento', 'Rape and Mustardseed', 'Sesame seed',
      'Soyabeans', 'Spices', 'Spices, Other', 'Stimulants', 'Sunflower seed',
      'Tea (including mate)'
    ]
  },
  'sugar': {
    name: 'Zucker und Süßstoffe',
    icon: '🍯',
    products: [
      'Beverages, Fermented', 'Honey', 'Sugar & Sweeteners', 'Sugar (Raw Equivalent)',
      'Sugar Crops', 'Sugar beet', 'Sugar cane', 'Sugar non-centrifugal',
      'Sweeteners, Other', 'Wine'
    ]
  },
  'other': {
    name: 'Andere',
    icon: '📦',
    products: [
      'Coconuts - Incl Copra', 'Infant food', 'Miscellaneous'
    ]
  }
}

/**
 * Get German name for a product
 * @param {string} englishName - The English product name
 * @returns {string} The German product name or English name if not found
 */
export const getGermanName = (englishName) => {
  return productMappings[englishName] || englishName
}

/**
 * Get German name for ML forecast products (handles underscore format)
 * @param {string} mlProductName - The ML product name (may contain underscores)
 * @returns {string} The German product name or formatted English name if not found
 */
export const getMLGermanName = (mlProductName) => {
  // First try direct mapping
  if (productMappings[mlProductName]) {
    return productMappings[mlProductName]
  }
  
  // Try with spaces instead of underscores
  const spaceVersion = mlProductName.replace(/_/g, ' ')
  if (productMappings[spaceVersion]) {
    return productMappings[spaceVersion]
  }
  
  // Try title case version
  const titleCase = spaceVersion
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
  if (productMappings[titleCase]) {
    return productMappings[titleCase]
  }
  
  // Fallback: format the product name nicely
  return mlProductName
    .replace(/_/g, ' ')
    .replace(/&/g, '&')
    .replace(/___/g, ' - ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get English name from German name
 * @param {string} germanName - The German product name
 * @returns {string} The English product name or German name if not found
 */
export const getEnglishName = (germanName) => {
  const entry = Object.entries(productMappings).find(([, german]) => german === germanName)
  return entry ? entry[0] : germanName
}

/**
 * Get category for a product
 * @param {string} productName - The product name (English)
 * @returns {string|null} The category key or null if not found
 */
export const getProductCategory = (productName) => {
  for (const [categoryKey, category] of Object.entries(productCategories)) {
    if (category.products.includes(productName)) {
      return categoryKey
    }
  }
  return 'other'
}

/**
 * Get all individual products with German names
 * @returns {Array} Array of product options with value and label
 */
export const getAllProductOptions = () => {
  return Object.keys(productMappings)
    .map(englishName => ({
      value: englishName,
      label: getGermanName(englishName),
      category: getProductCategory(englishName),
      categoryName: productCategories[getProductCategory(englishName)]?.name || 'Andere'
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'de'))
}

/**
 * Get products grouped by category
 * @returns {Object} Products grouped by category
 */
export const getProductsByCategory = () => {
  const grouped = {}
  
  for (const [categoryKey, category] of Object.entries(productCategories)) {
    grouped[categoryKey] = {
      ...category,
      products: category.products
        .map(englishName => ({
          value: englishName,
          label: getGermanName(englishName)
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'de'))
    }
  }
  
  return grouped
}

/**
 * Search products by German or English name
 * @param {string} searchTerm - The search term
 * @returns {Array} Matching product options
 */
export const searchProducts = (searchTerm) => {
  if (!searchTerm || searchTerm.length < 2) {
    return getAllProductOptions()
  }
  
  const term = searchTerm.toLowerCase()
  
  return getAllProductOptions().filter(product => 
    product.label.toLowerCase().includes(term) ||
    product.value.toLowerCase().includes(term)
  )
}