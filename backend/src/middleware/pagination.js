/**
 * Pagination Middleware
 * 
 * This middleware provides pagination functionality for API endpoints
 * that return large datasets.
 */

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/**
 * Parse pagination parameters from query string
 */
const parsePaginationParams = (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || DEFAULT_PAGE_SIZE;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    // Validate page number
    if (page < 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAGE',
          message: 'Page number must be greater than 0'
        }
      });
    }
    
    // Validate limit
    if (limit < 1 || limit > MAX_PAGE_SIZE) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_LIMIT',
          message: `Limit must be between 1 and ${MAX_PAGE_SIZE}`
        }
      });
    }
    
    // Calculate skip value
    const skip = (page - 1) * limit;
    
    // Add pagination info to request
    req.pagination = {
      page,
      limit,
      skip,
      sortBy,
      sortOrder,
      sort: { [sortBy]: sortOrder }
    };
    
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        code: 'PAGINATION_ERROR',
        message: 'Invalid pagination parameters'
      }
    });
  }
};

/**
 * Create paginated response
 */
const createPaginatedResponse = (data, total, pagination, req) => {
  const { page, limit } = pagination;
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    success: true,
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    },
    links: {
      self: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      first: `${req.protocol}://${req.get('host')}${req.path}?page=1&limit=${limit}`,
      last: `${req.protocol}://${req.get('host')}${req.path}?page=${totalPages}&limit=${limit}`,
      next: hasNextPage ? `${req.protocol}://${req.get('host')}${req.path}?page=${page + 1}&limit=${limit}` : null,
      prev: hasPrevPage ? `${req.protocol}://${req.get('host')}${req.path}?page=${page - 1}&limit=${limit}` : null
    }
  };
};

/**
 * MongoDB pagination helper
 */
const paginateQuery = async (Model, query = {}, options = {}) => {
  const {
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    sort = { createdAt: -1 },
    populate = null,
    select = null
  } = options;
  
  const skip = (page - 1) * limit;
  
  // Build query
  let mongoQuery = Model.find(query);
  
  // Apply sorting
  mongoQuery = mongoQuery.sort(sort);
  
  // Apply pagination
  mongoQuery = mongoQuery.skip(skip).limit(limit);
  
  // Apply population if specified
  if (populate) {
    mongoQuery = mongoQuery.populate(populate);
  }
  
  // Apply field selection if specified
  if (select) {
    mongoQuery = mongoQuery.select(select);
  }
  
  // Execute query and count in parallel
  const [data, total] = await Promise.all([
    mongoQuery.exec(),
    Model.countDocuments(query)
  ]);
  
  return {
    data,
    total,
    pagination: {
      page,
      limit,
      skip,
      sort
    }
  };
};

/**
 * Express middleware for paginated responses
 */
const paginatedResponse = (req, res, next) => {
  res.paginated = (data, total) => {
    const response = createPaginatedResponse(data, total, req.pagination, req);
    res.json(response);
  };
  next();
};

/**
 * Search and filter middleware
 */
const parseSearchParams = (req, res, next) => {
  try {
    const search = req.query.search || '';
    const filters = {};
    
    // Parse filter parameters
    Object.keys(req.query).forEach(key => {
      if (key.startsWith('filter_')) {
        const filterKey = key.replace('filter_', '');
        const filterValue = req.query[key];
        
        // Handle different filter types
        if (filterValue.includes(',')) {
          // Array filter (e.g., filter_status=active,inactive)
          filters[filterKey] = { $in: filterValue.split(',') };
        } else if (filterValue.startsWith('>')) {
          // Greater than filter
          filters[filterKey] = { $gt: filterValue.substring(1) };
        } else if (filterValue.startsWith('<')) {
          // Less than filter
          filters[filterKey] = { $lt: filterValue.substring(1) };
        } else if (filterValue.startsWith('>=')) {
          // Greater than or equal filter
          filters[filterKey] = { $gte: filterValue.substring(2) };
        } else if (filterValue.startsWith('<=')) {
          // Less than or equal filter
          filters[filterKey] = { $lte: filterValue.substring(2) };
        } else {
          // Exact match filter
          filters[filterKey] = filterValue;
        }
      }
    });
    
    // Add search functionality
    if (search) {
      const searchFields = req.query.searchFields ? 
        req.query.searchFields.split(',') : 
        ['name', 'title', 'description', 'username', 'email'];
      
      const searchRegex = new RegExp(search, 'i');
      filters.$or = searchFields.map(field => ({
        [field]: searchRegex
      }));
    }
    
    req.search = {
      query: search,
      filters,
      searchFields: req.query.searchFields ? req.query.searchFields.split(',') : []
    };
    
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: 'Invalid search parameters'
      }
    });
  }
};

module.exports = {
  parsePaginationParams,
  createPaginatedResponse,
  paginateQuery,
  paginatedResponse,
  parseSearchParams,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE
};
