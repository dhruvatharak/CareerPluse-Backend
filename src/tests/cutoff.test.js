/**
 * CareerPulse AI - Unit Tests for Cutoff Calculator & Chance Label Helpers
 * Tests calculation formulas, boundary thresholds, missing subject handling, and score parity.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTneaCutoff,
  calculateTwelfthPercentage,
  calculateRelevantSubjectAverage,
  evaluateNeetBand,
  determineEligibleCourses
} from '../helpers/cutoffCalculator.js';
import { getChanceLabel, getBucketCategory } from '../helpers/chanceLabel.js';

describe('Cutoff Calculator Tests', () => {
  // Test 1: TNEA Cutoff Standard Formula (Maths/2 + Physics/4 + Chemistry/4)
  it('should accurately calculate TNEA cutoff for perfect scores (100, 100, 100 -> 100.00)', () => {
    const cutoff = calculateTneaCutoff({ maths: 100, physics: 100, chemistry: 100 });
    assert.strictEqual(cutoff, 100.00);
  });

  // Test 2: TNEA Cutoff Typical Scores
  it('should accurately calculate TNEA cutoff for typical marks (Maths: 90, Physics: 80, Chemistry: 80 -> 85.00)', () => {
    const cutoff = calculateTneaCutoff({ maths: 90, physics: 80, chemistry: 80 });
    assert.strictEqual(cutoff, 85.00);
  });

  // Test 3: TNEA Cutoff with Missing Subjects
  it('should return null if any of Maths, Physics, or Chemistry is missing or null', () => {
    assert.strictEqual(calculateTneaCutoff({ maths: 90, physics: null, chemistry: 80 }), null);
    assert.strictEqual(calculateTneaCutoff({ maths: null, physics: 80, chemistry: 80 }), null);
    assert.strictEqual(calculateTneaCutoff({ maths: 90, physics: 80, chemistry: undefined }), null);
  });

  // Test 4: 12th Percentage Calculation
  it('should calculate 12th percentage accurately from entered subject marks', () => {
    const result = calculateTwelfthPercentage({
      marks: { maths: 90, physics: 80, chemistry: 85, biology: 95, english: 90 }
    });
    assert.strictEqual(result.total, 440);
    assert.strictEqual(result.percentage, 88.00);
  });

  // Test 5: 12th Percentage with Empty Marks
  it('should return 0 total and 0 percentage when no marks are provided', () => {
    const result = calculateTwelfthPercentage({ marks: {} });
    assert.strictEqual(result.total, 0);
    assert.strictEqual(result.percentage, 0);
  });

  // Test 6: Relevant Subject Average for Engineering
  it('should calculate relevant subject average for Engineering (Maths, Physics, Chemistry)', () => {
    const avg = calculateRelevantSubjectAverage({
      stream: 'Engineering',
      marks: { maths: 90, physics: 80, chemistry: 85, biology: 95 }
    });
    assert.strictEqual(avg, 85.00); // (90 + 80 + 85) / 3 = 85.00
  });

  // Test 7: Relevant Subject Average for Medical
  it('should calculate relevant subject average for Medical (Physics, Chemistry, Biology)', () => {
    const avg = calculateRelevantSubjectAverage({
      stream: 'Medical',
      marks: { maths: 90, physics: 80, chemistry: 85, biology: 90 }
    });
    assert.strictEqual(avg, 85.00); // (80 + 85 + 90) / 3 = 85.00
  });

  // Test 8: NEET Score Band Evaluation
  it('should categorize NEET score into above, within, or below DME category range', () => {
    const mockCutoffs = [
      { category: 'BC', courseId: 'CRS-MED-01', minNeetScore: 570, maxNeetScore: 665 }
    ];
    assert.strictEqual(evaluateNeetBand({ neetScore: 680, category: 'BC', medicalCutoffs: mockCutoffs }), 'above');
    assert.strictEqual(evaluateNeetBand({ neetScore: 620, category: 'BC', medicalCutoffs: mockCutoffs }), 'within');
    assert.strictEqual(evaluateNeetBand({ neetScore: 510, category: 'BC', medicalCutoffs: mockCutoffs }), 'below');
  });
});

describe('Chance Label & Threshold Tests', () => {
  // Test 9: TNEA Chance Label Thresholds (High, Good, Moderate, Borderline, Low)
  it('should assign High Chance for diff >= +8 and Good Chance for +3 <= diff < +8', () => {
    const high = getChanceLabel({ studentValue: 95.0, prevCutoff: 86.0, cutoffType: 'TNEA200' });
    assert.strictEqual(high.label, 'High Chance');
    assert.strictEqual(high.variant, 'green');

    const good = getChanceLabel({ studentValue: 90.0, prevCutoff: 85.0, cutoffType: 'TNEA200' });
    assert.strictEqual(good.label, 'Good Chance');
    assert.strictEqual(good.variant, 'blue');
  });

  // Test 10: TNEA Moderate, Borderline, and Low Chance
  it('should assign Moderate Chance for -2 <= diff < +3, Borderline for -5 <= diff < -2, and Low Chance for diff < -5', () => {
    const moderate = getChanceLabel({ studentValue: 88.0, prevCutoff: 88.0, cutoffType: 'TNEA200' });
    assert.strictEqual(moderate.label, 'Moderate Chance');
    assert.strictEqual(moderate.variant, 'lavender');

    const borderline = getChanceLabel({ studentValue: 84.0, prevCutoff: 88.0, cutoffType: 'TNEA200' });
    assert.strictEqual(borderline.label, 'Borderline');
    assert.strictEqual(borderline.variant, 'yellow');

    const low = getChanceLabel({ studentValue: 80.0, prevCutoff: 88.0, cutoffType: 'TNEA200' });
    assert.strictEqual(low.label, 'Low Chance');
    assert.strictEqual(low.variant, 'pink');
  });

  // Test 11: NEET Score Chance Thresholds (Scaled for 720)
  it('should assign High Chance for NEET when diff >= 28.8', () => {
    const res = getChanceLabel({ studentValue: 660, prevCutoff: 620, cutoffType: 'NEETScore' });
    assert.strictEqual(res.label, 'High Chance');
    assert.strictEqual(res.variant, 'green');
  });

  // Test 12: JEE Rank Chance (Lower Rank Number is Superior)
  it('should properly compare JEE Ranks where a lower rank number yields a higher chance', () => {
    // Student rank 3000 vs closing cutoff rank 5200 (diff = 5200 - 3000 = +2200 >= 2000 -> High Chance)
    const res = getChanceLabel({ studentValue: 3000, prevCutoff: 5200, cutoffType: 'JEERank' });
    assert.strictEqual(res.label, 'High Chance');
    assert.strictEqual(res.variant, 'green');

    // Student rank 8000 vs closing cutoff rank 5200 (diff = 5200 - 8000 = -2800 < -2000 -> Low Chance)
    const low = getChanceLabel({ studentValue: 8000, prevCutoff: 5200, cutoffType: 'JEERank' });
    assert.strictEqual(low.label, 'Low Chance');
    assert.strictEqual(low.variant, 'pink');
  });
});
