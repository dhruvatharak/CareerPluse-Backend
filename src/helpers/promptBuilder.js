/**
 * CareerPulse AI - LLM Prompt Builder
 * Constructs strictly-grounded system and user prompts for education counselling in Tamil Nadu.
 */

export const SYSTEM_COUNSELLOR_PROMPT = `You are a Tamil Nadu education counsellor. Recommend ONLY from the dataset rows provided. Never invent groups, courses, colleges, cutoffs, seats or fees. Reasons must reference the student's actual answers/marks/interests. Respond with strict JSON only in this schema: { "recommendations": [ { "id": string, "name": string, "category": "best"|"stretch"|"safe", "reason": string, "matchScore": number 0-100 } ], "summary": string }. Return maximum 5 recommendations. Tamil Nadu only.`;

/**
 * Builds user prompt for 10th standard Higher Secondary group selection.
 */
export const buildGroupPrompt = ({
  readableAnswers = [],
  categoryScores = {},
  tenthMarks = null,
  candidateGroups = []
}) => {
  const compactGroups = candidateGroups.map((grp) => ({
    id: grp.groupId,
    name: grp.name,
    subjects: grp.subjects,
    typicalMarks: grp.minMarks,
    degrees: grp.coursesAfter12th?.slice(0, 4),
    entranceExams: grp.entranceExams,
    govtCareers: grp.govtCareers?.slice(0, 3),
    privateCareers: grp.privateCareers?.slice(0, 3)
  }));

  let studentProfileText = `=== STUDENT QUIZ PROFILE ===\n`;
  studentProfileText += `Category Breakdown: Aptitude: ${categoryScores.Aptitude || 0}, Interest: ${
    categoryScores.Interest || 0
  }, Subject Strength: ${categoryScores['Subject Strength'] || 0}\n`;

  if (tenthMarks && typeof tenthMarks === 'object' && tenthMarks.total) {
    studentProfileText += `10th SSLC Marks: Maths: ${tenthMarks.maths || 'N/A'}/100, Science: ${
      tenthMarks.science || 'N/A'
    }/100, Social: ${tenthMarks.social || 'N/A'}/100, English: ${
      tenthMarks.english || 'N/A'
    }/100, Tamil: ${tenthMarks.tamil || 'N/A'}/100, Total: ${tenthMarks.total}/500\n`;
  }

  studentProfileText += `\nDetailed Responses:\n`;
  readableAnswers.forEach((ans, i) => {
    studentProfileText += `${i + 1}. [${ans.category}] ${ans.question} -> Answer: ${ans.answerText}\n`;
  });

  const datasetText = `\n=== ELIGIBLE DATASET GROUPS (Choose up to 5 ONLY from this list) ===\n${JSON.stringify(
    compactGroups,
    null,
    2
  )}`;

  const instructions = `\n=== INSTRUCTIONS ===
1. Select up to 5 recommendations from the eligible list above (typically 2 'best', 1 'stretch', 2 'safe').
2. Ensure every 'id' matches an 'id' from the dataset list exactly (e.g. 'GRP-101').
3. 'matchScore' must be an integer between 0 and 100.
4. Each 'reason' must explicitly cite the student's specific quiz answers, subjects, or marks.
5. Provide an insightful 2-sentence 'summary' tailored to Tamil Nadu state board career pathways.`;

  return `${studentProfileText}${datasetText}${instructions}`;
};

/**
 * Builds user prompt for Polytechnic Diploma course recommendations.
 */
export const buildDiplomaPrompt = ({
  interests = [],
  district = '',
  candidateCourses = [],
  candidateColleges = []
}) => {
  const compactCourses = candidateCourses.map((c) => ({
    id: c.courseId,
    name: c.name,
    duration: c.duration,
    interestTags: c.interestTags,
    careers: c.careers?.slice(0, 3),
    higherStudies: c.higherStudies?.slice(0, 2),
    govtCareers: c.govtCareers?.slice(0, 2)
  }));

  let studentText = `=== STUDENT INTERESTS ===\nSelected Tags: ${interests.join(', ')}\n`;
  if (district && district !== 'All') {
    studentText += `Preferred Tamil Nadu District: ${district}\n`;
  }

  const datasetText = `\n=== AVAILABLE DIPLOMA COURSES (Choose up to 5 ONLY from this list) ===\n${JSON.stringify(
    compactCourses,
    null,
    2
  )}`;

  const instructions = `\n=== INSTRUCTIONS ===
1. Recommend up to 5 courses strictly from the provided list based on the student's interest tags.
2. Ensure every 'id' matches the 'id' in the dataset (e.g. 'DIP-01').
3. Include categories: 'best', 'stretch', or 'safe'.
4. Provide a grounded explanation in 'reason' citing their specific interest tags and Tamil Nadu industry opportunities.
5. Provide a summary highlighting direct job readiness and lateral entry into engineering.`;

  return `${studentText}${datasetText}${instructions}`;
};

export const SYSTEM_CAREER_GUIDE_PROMPT = `You are a Tamil Nadu 12th standard higher education counsellor. Recommend ONLY from the dataset rows provided. Never invent cutoffs, seats, fees or colleges. Reasons must explicitly cite the student's actual value and the row's real previous cutoff. Respond with strict JSON only in this schema: { "recommendations": [ { "id": string, "name": string, "category": "best"|"stretch"|"safe", "reason": string, "matchScore": number 0-100 } ], "summary": string }. Return maximum 8 recommendations. Tamil Nadu only. Never guarantee admission.`;

/**
 * Builds user prompt for 12th Standard Career Guide & College Allocation.
 */
export const buildCareerGuidePrompt = ({
  studentValue,
  cutoffType,
  stream,
  category = 'OC',
  district = '',
  selectedOptions = [],
  candidateRows = []
}) => {
  const compactCandidates = candidateRows.map((row) => ({
    id: row.id, // compositeId: collegeId__courseId
    collegeName: row.collegeName,
    courseName: row.courseName,
    cutoffType: row.cutoffType,
    prevCutoff: row.prevCutoff,
    tier: row.tier,
    district: row.district,
    academicYear: row.academicYear,
    intake: row.intake || 'N/A',
    admitted: row.admitted || 'N/A',
    bucket: row.bucket // 'best' | 'stretch' | 'safe'
  }));

  let studentProfile = `=== STUDENT 12TH ACADEMIC PROFILE ===\n`;
  studentProfile += `Stream: ${stream}\n`;
  studentProfile += `Student Value: ${studentValue} (${cutoffType})\n`;
  studentProfile += `Reservation Category: ${category}\n`;
  if (district && district !== 'All') {
    studentProfile += `Home District: ${district}\n`;
  }
  studentProfile += `Selected Career Options: ${selectedOptions.join(', ')}\n`;

  const datasetText = `\n=== CANDIDATE COLLEGE & COURSE ROWS (Choose up to 8 ONLY from this list) ===\n${JSON.stringify(
    compactCandidates,
    null,
    2
  )}`;

  const instructions = `\n=== INSTRUCTIONS ===
1. Select up to 8 recommendations strictly from the provided candidate rows.
2. Every recommendation 'id' MUST exactly match a candidate 'id' from the list above (e.g. 'COL-01__CRS-ENG-01').
3. Assign each a category ('best', 'stretch', or 'safe') and a matchScore (0 to 100).
4. In 'reason', explicitly cite the student's actual value (${studentValue}) and the candidate's actual previous cutoff.
5. In 'summary', write a 2-3 sentence personalized guidance summary for admission counselling in Tamil Nadu.
6. Never guarantee admission; previous cutoff is an indicator, not a guarantee.`;

  return `${studentProfile}${datasetText}${instructions}`;
};

export default {
  SYSTEM_COUNSELLOR_PROMPT,
  buildGroupPrompt,
  buildDiplomaPrompt,
  SYSTEM_CAREER_GUIDE_PROMPT,
  buildCareerGuidePrompt
};
