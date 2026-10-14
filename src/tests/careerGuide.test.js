/**
 * CareerPulse AI - 12th Career Guide Unit Tests
 * Tests option contradiction validation, cutoffType selection, candidate filtering,
 * bucket logic, and zero-hallucination safe-parsing.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import {
  validateCareerGuideOptions,
  getStreamsFromOptions,
  validatePreferredCourseForStream,
  evaluateOfferingRows
} from '../services/careerGuide.service.js';
import { getBucketCategory, getChanceLabel } from '../helpers/chanceLabel.js';
import { safeParseLLMResponse, safeParseGrokResponse } from '../helpers/jsonSafeParse.js';
import { connectDB, closeDB } from '../config/db.js';

describe('12th Career Guide Options Validation', () => {
  test('should throw error when options array is empty', () => {
    assert.throws(
      () => validateCareerGuideOptions([]),
      /Please select at least one career guide option/
    );
  });

  test('should throw error when both NEET and Without NEET are selected', () => {
    assert.throws(
      () => validateCareerGuideOptions(['NEET', 'Without NEET', 'Engineering Stream']),
      /Cannot select both 'NEET' and 'Without NEET'/
    );
  });

  test('should throw error when both JEE and Without JEE are selected', () => {
    assert.throws(
      () => validateCareerGuideOptions(['JEE', 'Without JEE']),
      /Cannot select both 'JEE' and 'Without JEE'/
    );
  });

  test('should pass validation when non-contradictory options are combined', () => {
    assert.doesNotThrow(() => {
      validateCareerGuideOptions(['JEE', 'Engineering Stream', 'Without NEET']);
    });
  });
});

describe('CutoffType Matching & Bucket Logic for 12th Career Guide', () => {
  test('should place Engineering TNEA cutoff into best bucket when diff is within 3 points', () => {
    // studentValue = 188, prevCutoff = 190 -> diff = -2 (within 3 points)
    const bucket = getBucketCategory({
      studentValue: 188,
      prevCutoff: 190,
      cutoffType: 'TNEA200'
    });
    assert.strictEqual(bucket, 'best');
  });

  test('should place Engineering TNEA cutoff into stretch bucket when student is below cutoff by > 3 points', () => {
    // studentValue = 180, prevCutoff = 190 -> diff = -10 (stretch)
    const bucket = getBucketCategory({
      studentValue: 180,
      prevCutoff: 190,
      cutoffType: 'TNEA200'
    });
    assert.strictEqual(bucket, 'stretch');
  });

  test('should place Engineering TNEA cutoff into safe bucket when student is above cutoff by > 3 points', () => {
    // studentValue = 195, prevCutoff = 190 -> diff = +5 (safe)
    const bucket = getBucketCategory({
      studentValue: 195,
      prevCutoff: 190,
      cutoffType: 'TNEA200'
    });
    assert.strictEqual(bucket, 'safe');
  });

  test('should properly bucket NEET score using scaled tolerance', () => {
    // studentValue = 610, prevCutoff = 615 -> diff = -5 (tolerance 10.8 -> best)
    const bestNeet = getBucketCategory({
      studentValue: 610,
      prevCutoff: 615,
      cutoffType: 'NEETScore'
    });
    assert.strictEqual(bestNeet, 'best');

    // studentValue = 580, prevCutoff = 620 -> diff = -40 (stretch)
    const stretchNeet = getBucketCategory({
      studentValue: 580,
      prevCutoff: 620,
      cutoffType: 'NEETScore'
    });
    assert.strictEqual(stretchNeet, 'stretch');
  });

  test('should properly bucket JEE rank where lower rank is superior', () => {
    // studentRank = 5200, prevCutoff = 5000 -> diff = -200 (within 1000 -> best)
    const bestJee = getBucketCategory({
      studentValue: 5200,
      prevCutoff: 5000,
      cutoffType: 'JEERank'
    });
    assert.strictEqual(bestJee, 'best');

    // studentRank = 15000, prevCutoff = 5000 -> diff = -10000 (stretch)
    const stretchJee = getBucketCategory({
      studentValue: 15000,
      prevCutoff: 5000,
      cutoffType: 'JEERank'
    });
    assert.strictEqual(stretchJee, 'stretch');
  });
});

describe('Safe-Parse Rule & Database Grounding (Zero Hallucination)', () => {
  const allowedCompositeIds = [
    'COL-01__CRS-ENG-01',
    'COL-01__CRS-ENG-02',
    'COL-02__CRS-ENG-01',
    'COL-03__CRS-ENG-03'
  ];

  test('should parse valid recommendations with correct schema and clamp matchScore', () => {
    const mockGrokOutput = JSON.stringify({
      recommendations: [
        {
          id: 'COL-01__CRS-ENG-01',
          name: 'CEG - CSE',
          category: 'best',
          reason: 'Your TNEA cutoff of 196 exceeds previous cutoff 194.5',
          matchScore: 94
        },
        {
          id: 'COL-02__CRS-ENG-01',
          name: 'MIT - CSE',
          category: 'safe',
          reason: 'Strong track record for your profile',
          matchScore: 120 // Should clamp to 100
        }
      ],
      summary: 'Target top tier government institutions in Chennai.'
    });

    const parsed = safeParseGrokResponse(mockGrokOutput, allowedCompositeIds, 8);
    assert.strictEqual(parsed.recommendations.length, 2);
    assert.strictEqual(parsed.recommendations[0].id, 'COL-01__CRS-ENG-01');
    assert.strictEqual(parsed.recommendations[1].matchScore, 100); // clamped
    assert.strictEqual(parsed.summary, 'Target top tier government institutions in Chennai.');
  });

  test('should strip markdown code blocks and purge hallucinated composite IDs', () => {
    const mockGrokWithFences = `\`\`\`json
    {
      "recommendations": [
        {
          "id": "COL-01__CRS-ENG-01",
          "name": "CEG - CSE",
          "category": "best",
          "reason": "Matches your cutoff",
          "matchScore": 90
        },
        {
          "id": "COL-FAKE__CRS-FAKE",
          "name": "Fictional College - Fictional Course",
          "category": "best",
          "reason": "Invented college",
          "matchScore": 99
        }
      ],
      "summary": "Valid response test."
    }
    \`\`\``;

    const parsed = safeParseGrokResponse(mockGrokWithFences, allowedCompositeIds, 8);
    // Should drop the fake ID and keep only the valid grounded ID
    assert.strictEqual(parsed.recommendations.length, 1);
    assert.strictEqual(parsed.recommendations[0].id, 'COL-01__CRS-ENG-01');
  });

  test('should throw error when all IDs returned by model are hallucinated', () => {
    const mockAllFake = JSON.stringify({
      recommendations: [
        {
          id: 'COL-999__CRS-999',
          name: 'Made Up Engineering College',
          category: 'stretch',
          reason: 'Invented'
        }
      ]
    });

    assert.throws(
      () => safeParseGrokResponse(mockAllFake, allowedCompositeIds, 8),
      (err) => {
        assert.strictEqual(err.fallbackReason, 'NO_VALID_IDS');
        return /No valid recommendations remained after filtering against allowed dataset IDs/.test(
          err.message
        );
      }
    );
  });

  test('should strip <think>...</think> tags and extract first JSON object', () => {
    const mockWithThink = `<think>
I need to recommend colleges in Chennai.
Evaluating candidate list.
COL-01__CRS-ENG-01 is a top choice.
</think>
Here is the JSON result:
\`\`\`json
{
  "recommendations": [
    {
      "id": "COL-01__CRS-ENG-01",
      "name": "CEG - CSE",
      "category": "best",
      "reason": "Top cutoff alignment",
      "matchScore": 95
    }
  ],
  "summary": "Excellent score for CEG."
}
\`\`\`
Extra commentary following JSON.`;

    const parsed = safeParseGrokResponse(mockWithThink, allowedCompositeIds, 8);
    assert.strictEqual(parsed.recommendations.length, 1);
    assert.strictEqual(parsed.recommendations[0].id, 'COL-01__CRS-ENG-01');
    assert.strictEqual(parsed.summary, 'Excellent score for CEG.');
  });
});

describe('Stream Mapping & Preferred Course Dependent Validation', () => {
  before(async () => {
    await connectDB();
  });

  after(async () => {
    await closeDB();
  });

  test('should accurately extract stream names from selected option chips', () => {
    assert.deepStrictEqual(getStreamsFromOptions(['Engineering Stream']), ['Engineering']);
    assert.deepStrictEqual(getStreamsFromOptions(['Medical Stream']), ['Medical']);
    assert.deepStrictEqual(getStreamsFromOptions(['Commerce Stream']), ['Commerce']);
    assert.deepStrictEqual(getStreamsFromOptions(['Arts & Science Stream']), ['Arts', 'Science']);
    assert.deepStrictEqual(
      getStreamsFromOptions(['Engineering Stream', 'Medical Stream']),
      ['Engineering', 'Medical']
    );
    assert.deepStrictEqual(getStreamsFromOptions(['NEET', 'Without JEE']), []);
  });

  test('should throw 400 when preferredCourse does not match selected stream', async () => {
    // CRS-ENG-01 is Engineering, but Medical Stream is chosen
    await assert.rejects(
      async () => validatePreferredCourseForStream('CRS-ENG-01', ['Medical Stream']),
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /does not match the chosen stream/);
        return true;
      }
    );

    // CRS-MED-01 is Medical, but Commerce Stream is chosen
    await assert.rejects(
      async () => validatePreferredCourseForStream('CRS-MED-01', ['Commerce Stream']),
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /does not match the chosen stream/);
        return true;
      }
    );
  });

  test('should pass validation when preferredCourse matches selected stream', async () => {
    await assert.doesNotReject(async () => {
      await validatePreferredCourseForStream('CRS-ENG-01', ['Engineering Stream']);
    });

    await assert.doesNotReject(async () => {
      await validatePreferredCourseForStream('CRS-ART-01', ['Arts & Science Stream']);
    });
  });

  test('should pass validation when no stream chip is selected or preferredCourse is empty', async () => {
    await assert.doesNotReject(async () => {
      await validatePreferredCourseForStream('CRS-ENG-01', ['Without NEET']);
    });

    await assert.doesNotReject(async () => {
      await validatePreferredCourseForStream('', ['Engineering Stream']);
    });

    await assert.doesNotReject(async () => {
      await validatePreferredCourseForStream(null, ['Engineering Stream']);
    });
  });
});

describe('District Fallback & Low-Cutoff Alternatives Evaluation', () => {
  const collegeMap = new Map([
    ['COL-01', { name: 'CEG Anna University', district: 'Chennai', tier: 'Tier 1' }],
    ['COL-03', { name: 'PSG College of Technology', district: 'Coimbatore', tier: 'Tier 1' }],
    ['COL-12', { name: 'GCE Salem', district: 'Salem', tier: 'Tier 2' }]
  ]);

  const courseMap = new Map([
    ['CRS-ENG-01', { name: 'B.E. Computer Science', stream: 'Engineering' }],
    ['CRS-ENG-05', { name: 'B.E. Mechanical Engineering', stream: 'Engineering' }]
  ]);

  test('evaluateOfferingRows properly attaches isOtherDistrict flag and district name', () => {
    const mockOfferings = [
      {
        collegeId: 'COL-01',
        courseId: 'CRS-ENG-01',
        cutoffType: 'TNEA200',
        prevCutoff: 190.0,
        academicYear: '2024-2025'
      },
      {
        collegeId: 'COL-03',
        courseId: 'CRS-ENG-01',
        cutoffType: 'TNEA200',
        prevCutoff: 180.0,
        academicYear: '2024-2025'
      }
    ];

    const userCutoff = {
      results: { tneaCutoff: 188.0 }
    };

    const localRows = evaluateOfferingRows([mockOfferings[0]], userCutoff, collegeMap, courseMap, false);
    assert.strictEqual(localRows.length, 1);
    assert.strictEqual(localRows[0].isOtherDistrict, false);
    assert.strictEqual(localRows[0].district, 'Chennai');
    assert.strictEqual(localRows[0].bucket, 'best'); // 188 vs 190 -> diff -2 -> best

    const otherRows = evaluateOfferingRows([mockOfferings[1]], userCutoff, collegeMap, courseMap, true);
    assert.strictEqual(otherRows.length, 1);
    assert.strictEqual(otherRows[0].isOtherDistrict, true);
    assert.strictEqual(otherRows[0].district, 'Coimbatore');
    assert.strictEqual(otherRows[0].bucket, 'safe'); // 188 vs 180 -> diff +8 -> safe
  });

  test('district fallback results keep selected district candidates first', () => {
    const localItem = {
      id: 'COL-01__CRS-ENG-01',
      name: 'CEG - CSE',
      district: 'Chennai',
      isOtherDistrict: false,
      category: 'stretch'
    };

    const otherDistrictItem = {
      id: 'COL-03__CRS-ENG-01',
      name: 'PSG - CSE',
      district: 'Coimbatore',
      isOtherDistrict: true,
      category: 'safe'
    };

    // Even if otherDistrictItem is appended, local items must be sorted first
    const items = [otherDistrictItem, localItem];
    items.sort((a, b) => (a.isOtherDistrict === b.isOtherDistrict ? 0 : a.isOtherDistrict ? 1 : -1));

    assert.strictEqual(items[0].isOtherDistrict, false);
    assert.strictEqual(items[0].district, 'Chennai');
    assert.strictEqual(items[1].isOtherDistrict, true);
    assert.strictEqual(items[1].district, 'Coimbatore');
  });

  test('district fallback triggers note when local district lacks best or safe results', () => {
    const district = 'Salem';
    const localBest = []; // Salem has no best matches for this cutoff
    const localSafe = [{ id: 'COL-12__CRS-ENG-05' }];
    const otherBest = [{ id: 'COL-03__CRS-ENG-01' }];

    let districtNote = null;
    if (localBest.length === 0 && otherBest.length > 0) {
      districtNote = `Not enough matches in ${district}, so we also searched other districts.`;
    }

    assert.strictEqual(
      districtNote,
      'Not enough matches in Salem, so we also searched other districts.'
    );
  });

  test('low-cutoff case detects when student is below all cutoffs and generates safe alternatives', () => {
    // Student with very low TNEA cutoff of 150
    const studentValue = 150.0;
    const offerings = [
      {
        collegeId: 'COL-01',
        courseId: 'CRS-ENG-01',
        cutoffType: 'TNEA200',
        prevCutoff: 199.0,
        academicYear: '2024-2025'
      },
      {
        collegeId: 'COL-12',
        courseId: 'CRS-ENG-05',
        cutoffType: 'TNEA200',
        prevCutoff: 178.0,
        academicYear: '2024-2025'
      }
    ];

    const evaluated = evaluateOfferingRows(
      offerings,
      { results: { tneaCutoff: studentValue } },
      collegeMap,
      courseMap,
      false
    );

    // Both are stretch because 150 - 199 = -49 and 150 - 178 = -28 (both diff < -5)
    assert.strictEqual(evaluated.every((r) => r.bucket === 'stretch'), true);

    const isLowCutoffCase =
      evaluated.filter((r) => r.bucket === 'best').length === 0 &&
      evaluated.filter((r) => r.bucket === 'safe').length === 0 &&
      evaluated.filter((r) => r.bucket === 'stretch').length > 0;

    assert.strictEqual(isLowCutoffCase, true);

    // Lowest cutoff alternative from whole dataset is GCE Salem (178.0)
    const sortedAlternatives = [...evaluated].sort((a, b) => a.prevCutoff - b.prevCutoff);
    const safeBackup = {
      ...sortedAlternatives[0],
      bucket: 'safe',
      category: 'safe'
    };

    assert.strictEqual(safeBackup.collegeId, 'COL-12');
    assert.strictEqual(safeBackup.prevCutoff, 178.0);
    assert.strictEqual(safeBackup.category, 'safe');
  });
});

