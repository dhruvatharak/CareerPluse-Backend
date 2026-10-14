/**
 * CareerPulse AI - CSV Dataset Loader Helper
 * Safely parses CSV files, transforms "|" delimited strings into arrays, and casts numbers & booleans.
 */

import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';

/**
 * Parses a CSV file and converts typed fields
 * @param {string} filePath - Absolute path to the CSV file
 * @param {Object} options - Field parsing configuration
 * @returns {Promise<Array>} Array of parsed records
 */
export const loadCSV = (filePath, options = {}) => {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) {
      console.warn(`[CSV Loader] Warning: File not found at ${filePath}. Skipping.`);
      return resolve(null);
    }

    const results = [];
    const { arrayFields = [], numberFields = [], booleanFields = [] } = options;

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => {
        const cleanRow = {};
        for (const [key, value] of Object.entries(data)) {
          const cleanKey = key.trim();
          const rawVal = typeof value === 'string' ? value.trim() : value;

          if (arrayFields.includes(cleanKey)) {
            cleanRow[cleanKey] = rawVal
              ? rawVal.split('|').map((item) => item.trim()).filter(Boolean)
              : [];
          } else if (numberFields.includes(cleanKey)) {
            const num = parseFloat(rawVal);
            cleanRow[cleanKey] = isNaN(num) ? 0 : num;
          } else if (booleanFields.includes(cleanKey)) {
            cleanRow[cleanKey] = rawVal === 'true' || rawVal === true || rawVal === '1';
          } else {
            cleanRow[cleanKey] = rawVal;
          }
        }
        results.push(cleanRow);
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (err) => {
        console.warn(`[CSV Loader] Warning while reading ${path.basename(filePath)}: ${err.message}`);
        resolve(null);
      });
  });
};
