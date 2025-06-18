import { z } from 'zod'

// Base schemas for common data types
export const countryCodeSchema = z.string().length(3, 'Country code must be exactly 3 characters')
export const yearSchema = z.number().int().min(1960).max(2030)
export const positiveNumberSchema = z.number().positive('Value must be positive')
export const percentageSchema = z.number().min(0).max(100)

// Geographic data validation
export const coordinateSchema = z.number().min(-180).max(180)
export const latitudeSchema = z.number().min(-90).max(90)
export const longitudeSchema = z.number().min(-180).max(180)

export const geoPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([longitudeSchema, latitudeSchema])
})

export const geoFeatureSchema = z.object({
  type: z.literal('Feature'),
  properties: z.record(z.any()),
  geometry: z.object({
    type: z.enum(['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon']),
    coordinates: z.any() // Complex validation depends on geometry type
  })
})

export const geoJsonSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(geoFeatureSchema)
})

// FAO data validation schemas
export const faoDataPointSchema = z.object({
  area_code: countryCodeSchema,
  area: z.string().min(1, 'Area name is required'),
  item_code: z.number().int().positive(),
  item: z.string().min(1, 'Item name is required'),
  element_code: z.number().int().positive(),
  element: z.string().min(1, 'Element name is required'),
  year: yearSchema,
  unit: z.string().min(1, 'Unit is required'),
  value: z.number().nullable(),
  flag: z.string().optional()
})

// Updated timeseries schema to match actual data structure
export const timeseriesYearDataSchema = z.object({
  year: yearSchema,
  production: z.number().nullable().optional(),
  imports: z.number().nullable().optional(),
  exports: z.number().nullable().optional(),
  domestic_supply: z.number().nullable().optional(),
  feed: z.number().nullable().optional(),
  food: z.number().nullable().optional(),
  other_uses: z.number().nullable().optional(),
  processing: z.number().nullable().optional(),
  seed: z.number().nullable().optional(),
  stock_variation: z.number().nullable().optional(),
  total_supply: z.number().nullable().optional()
})

export const timeseriesItemSchema = z.object({
  country: z.string().min(1, 'Country is required'),
  item: z.string().min(1, 'Item is required'),
  unit: z.string().min(1, 'Unit is required'),
  data: z.array(timeseriesYearDataSchema)
})

export const faoTimeseriesSchema = z.array(timeseriesItemSchema)

// Production data validation
export const productionDataSchema = z.object({
  country: z.string().min(1, 'Country is required'),
  country_code: countryCodeSchema,
  item: z.string().min(1, 'Item is required'),
  year: yearSchema,
  production: positiveNumberSchema.nullable(),
  area_harvested: positiveNumberSchema.nullable(),
  yield: positiveNumberSchema.nullable()
})

// ML prediction validation
export const mlPredictionSchema = z.object({
  region: z.string().min(1, 'Region is required'),
  item: z.string().min(1, 'Item is required'),
  year: yearSchema,
  predicted_value: z.number(),
  confidence_interval: z.object({
    lower: z.number(),
    upper: z.number()
  }),
  model_accuracy: percentageSchema,
  last_updated: z.string().datetime()
})

// Form validation schemas
export const searchFormSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Query too long'),
  filters: z.object({
    countries: z.array(countryCodeSchema).optional(),
    items: z.array(z.string()).optional(),
    years: z.object({
      start: yearSchema,
      end: yearSchema
    }).refine(data => data.start <= data.end, {
      message: 'Start year must be before or equal to end year'
    }).optional()
  }).optional()
})

export const exportFormSchema = z.object({
  format: z.enum(['csv', 'json', 'xlsx'], 'Invalid export format'),
  data_type: z.enum(['production', 'trade', 'prices', 'forecast'], 'Invalid data type'),
  filters: z.object({
    countries: z.array(countryCodeSchema).min(1, 'At least one country must be selected'),
    years: z.object({
      start: yearSchema,
      end: yearSchema
    }).refine(data => data.start <= data.end, {
      message: 'Start year must be before or equal to end year'
    }),
    items: z.array(z.string()).min(1, 'At least one item must be selected')
  })
})

// User preferences validation
export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).default('auto'),
  language: z.enum(['en', 'es', 'fr', 'de']).default('en'),
  default_view: z.enum(['dashboard', 'timeseries', 'map']).default('dashboard'),
  chart_settings: z.object({
    animation_duration: z.number().min(0).max(5000).default(750),
    show_tooltips: z.boolean().default(true),
    show_legend: z.boolean().default(true),
    color_scheme: z.enum(['default', 'colorblind', 'high_contrast']).default('default')
  }).default({}),
  data_settings: z.object({
    cache_duration: z.number().min(300).max(86400).default(3600), // 5 minutes to 24 hours
    auto_refresh: z.boolean().default(false),
    download_quality: z.enum(['low', 'medium', 'high']).default('medium')
  }).default({})
})

// API response validation
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional()
  }).optional(),
  metadata: z.object({
    timestamp: z.string().datetime(),
    version: z.string(),
    total_records: z.number().int().min(0).optional(),
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).optional()
  }).optional()
})

// Utility functions for validation
export const validateData = (schema, data) => {
  try {
    return {
      success: true,
      data: schema.parse(data),
      errors: null
    }
  } catch (error) {
    return {
      success: false,
      data: null,
      errors: error.errors || [{ message: error.message }]
    }
  }
}

export const validateAsync = async (schema, data) => {
  try {
    const result = await schema.parseAsync(data)
    return {
      success: true,
      data: result,
      errors: null
    }
  } catch (error) {
    return {
      success: false,
      data: null,
      errors: error.errors || [{ message: error.message }]
    }
  }
}

// Data completeness validation
export const validateDataCompleteness = (data, requiredFields = []) => {
  const missing = []
  const invalid = []
  
  requiredFields.forEach(field => {
    const value = data[field]
    if (value === undefined || value === null || value === '') {
      missing.push(field)
    } else if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
      invalid.push(field)
    }
  })
  
  return {
    isComplete: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    completeness: ((requiredFields.length - missing.length - invalid.length) / requiredFields.length) * 100
  }
}

// Boundary validation for numerical inputs
export const createBoundaryValidator = (min, max, fieldName = 'Value') => {
  return z.number({
    required_error: `${fieldName} is required`,
    invalid_type_error: `${fieldName} must be a number`
  })
  .min(min, `${fieldName} must be at least ${min}`)
  .max(max, `${fieldName} must be at most ${max}`)
  .finite(`${fieldName} must be a finite number`)
}

// Custom validation for specific use cases
export const validateCountryData = (data) => {
  const schema = z.object({
    countries: z.array(z.object({
      code: countryCodeSchema,
      name: z.string().min(1),
      region: z.string().min(1),
      coordinates: z.object({
        lat: latitudeSchema,
        lng: longitudeSchema
      }).optional()
    })).min(1, 'At least one country is required')
  })
  
  return validateData(schema, { countries: data })
}

export const validateTimeRange = (startYear, endYear) => {
  const schema = z.object({
    start: yearSchema,
    end: yearSchema
  }).refine(data => data.start <= data.end, {
    message: 'Start year must be before or equal to end year'
  }).refine(data => data.end - data.start <= 50, {
    message: 'Time range cannot exceed 50 years'
  })
  
  return validateData(schema, { start: startYear, end: endYear })
}