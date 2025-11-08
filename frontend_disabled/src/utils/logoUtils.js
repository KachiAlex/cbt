// Utility functions for generating institution logos and fallbacks

/**
 * Generate a data URL for a simple logo with institution initials
 * @param {string} name - Institution name
 * @param {string} color - Background color (hex)
 * @param {string} textColor - Text color (hex, defaults to white)
 * @returns {string} Data URL for the logo
 */
export const generateInstitutionLogo = (name, color = '#4F46E5', textColor = '#FFFFFF') => {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const svg = `
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="${color}" rx="8"/>
      <text x="50" y="55" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${textColor}" text-anchor="middle">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Get a color for an institution based on its name
 * @param {string} name - Institution name
 * @returns {string} Hex color code
 */
export const getInstitutionColor = (name) => {
  const colors = [
    '#4F46E5', // Indigo
    '#059669', // Emerald
    '#DC2626', // Red
    '#7C3AED', // Violet
    '#EA580C', // Orange
    '#0891B2', // Cyan
    '#BE185D', // Pink
    '#65A30D', // Lime
    '#CA8A04', // Yellow
    '#9333EA'  // Purple
  ];

  // Simple hash function to get consistent color for same name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Generate a complete logo data URL for an institution
 * @param {string} name - Institution name
 * @returns {string} Data URL for the logo
 */
export const getInstitutionLogo = (name) => {
  const color = getInstitutionColor(name);
  return generateInstitutionLogo(name, color);
};

/**
 * Create a fallback logo component for institutions without logos
 * @param {string} name - Institution name
 * @param {string} className - CSS classes
 * @returns {object} React element props
 */
export const createFallbackLogo = (name, className = 'w-12 h-12') => {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const color = getInstitutionColor(name);

  return {
    className: `${className} rounded-lg border flex items-center justify-center text-white font-bold text-sm`,
    style: { backgroundColor: color },
    children: initials
  };
};
