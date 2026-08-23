/**
 * Solar capacity calculation formulas from the project brief.
 */

/**
 * Calculate the number of solar panels from solar area.
 * Formula: No. of Panels = Solar_Area / 2.58
 */
export const calculatePanels = (solarAreaSqm) => {
  if (!solarAreaSqm || solarAreaSqm <= 0) return 0;
  return Math.floor(solarAreaSqm / 2.58);
};

/**
 * Calculate installed capacity from solar area.
 * Formula: Installed Capacity (W) = No. of Panels × 580
 */
export const calculateCapacity = (solarAreaSqm) => {
  const panels = calculatePanels(solarAreaSqm);
  return panels * 580;
};

/**
 * Convert watts to kilowatts with rounding.
 */
export const wattsToKW = (watts) => {
  return Math.round((watts / 1000) * 100) / 100;
};

/**
 * Convert watts to megawatts with rounding.
 */
export const wattsToMW = (watts) => {
  return Math.round((watts / 1000000) * 100) / 100;
};

/**
 * Format a number with commas and optional decimal places.
 */
export const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format area value with appropriate unit.
 */
export const formatArea = (sqm) => {
  if (!sqm) return '0 sqm';
  if (sqm >= 1000000) {
    return `${formatNumber(sqm / 1000000, 2)} km²`;
  }
  return `${formatNumber(sqm, 2)} sqm`;
};
