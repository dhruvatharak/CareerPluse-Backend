/**
 * CareerPulse AI - Rule-based Career & Group Scoring Engine
 * Deterministic scoring for 10th Aptitude Quizzes and Polytechnic Diploma courses.
 * Acts as both the primary pre-filter for LLM candidate selection and the robust fallback engine.
 */

/**
 * Calculates category scores and group alignment scores for a completed quiz attempt.
 *
 * @param {Object} params
 * @param {Array} params.questions - Full list of QuizQuestion documents
 * @param {Array} params.answers - Student submitted [{ questionId, selectedOption }]
 * @param {Object} [params.tenthMarks] - Optional student marks in SSLC
 * @param {Array} params.allGroups - List of all Group documents from DB
 * @returns {Object} { categoryScores, groupScores, rankedGroups }
 */
export const scoreQuizAttempt = ({ questions, answers, tenthMarks = null, allGroups = [] }) => {
  const categoryScores = {
    Aptitude: 0,
    Interest: 0,
    'Subject Strength': 0
  };

  const rawGroupPoints = {};
  const questionMap = new Map();
  questions.forEach((q) => questionMap.set(q.questionId, q));

  let totalValidAnswers = 0;

  answers.forEach((ans) => {
    const question = questionMap.get(ans.questionId);
    if (!question) return;

    totalValidAnswers++;

    // 1. Tally category distribution
    if (categoryScores[question.category] !== undefined) {
      categoryScores[question.category] += 1;
    }

    // 2. Identify mapped group
    const mapKey = `mapsTo${ans.selectedOption.toUpperCase()}`;
    const mappedGroupId = question[mapKey];

    if (mappedGroupId) {
      rawGroupPoints[mappedGroupId] = (rawGroupPoints[mappedGroupId] || 0) + 1;
    }
  });

  // Calculate baseline normalized score (0-100)
  const groupScores = {};
  allGroups.forEach((grp) => {
    const points = rawGroupPoints[grp.groupId] || 0;
    // Scale points to 0-100 base
    const baseScore = totalValidAnswers > 0 ? (points / totalValidAnswers) * 100 * 2.2 : 30;
    groupScores[grp.groupId] = Math.min(85, Math.round(baseScore + 20));
  });

  // 3. Apply 10th marks alignment boost if student entered marks
  if (tenthMarks && typeof tenthMarks === 'object') {
    const maths = Number(tenthMarks.maths) || 0;
    const science = Number(tenthMarks.science) || 0;
    const social = Number(tenthMarks.social) || 0;
    const english = Number(tenthMarks.english) || 0;

    // Strong STEM boost
    if (maths >= 75 && science >= 75) {
      if (groupScores['GRP-101']) groupScores['GRP-101'] += 15; // Bio-Maths
      if (groupScores['GRP-102']) groupScores['GRP-102'] += 16; // CS with Maths
      if (groupScores['GRP-104']) groupScores['GRP-104'] += 12; // Biology CS
    } else if (science >= 80 && maths < 60) {
      if (groupScores['GRP-103']) groupScores['GRP-103'] += 16; // Pure Science
      if (groupScores['GRP-101']) groupScores['GRP-101'] += 8;
    }

    // Commerce & Business calculation boost
    if (social >= 70 || (maths >= 65 && social >= 65)) {
      if (groupScores['GRP-105']) groupScores['GRP-105'] += 14; // Commerce with CA
      if (groupScores['GRP-106']) groupScores['GRP-106'] += 12; // Commerce
    }

    // Arts, Humanities, and Law inclination
    if (social >= 80 && english >= 70) {
      if (groupScores['GRP-108']) groupScores['GRP-108'] += 18; // Arts / Humanities
    }

    // Vocational preference if hands-on score or lower theoretical marks
    if (tenthMarks.total && Number(tenthMarks.total) < 280) {
      if (groupScores['GRP-110']) groupScores['GRP-110'] += 15; // General Machinist / Vocational
      if (groupScores['GRP-114']) groupScores['GRP-114'] += 15; // Automobile Vocational
    }
  }

  // Clamp all scores between 15 and 98
  Object.keys(groupScores).forEach((gid) => {
    groupScores[gid] = Math.max(15, Math.min(98, Math.round(groupScores[gid])));
  });

  // Rank groups descending
  const rankedGroups = allGroups
    .map((grp) => ({
      group: grp,
      score: groupScores[grp.groupId] || 40
    }))
    .sort((a, b) => b.score - a.score);

  return { categoryScores, groupScores, rankedGroups };
};

/**
 * Builds deterministic fallback recommendations for a quiz attempt if AI providers are offline.
 */
export const buildFallbackQuizRecommendations = ({ rankedGroups, tenthMarks }) => {
  const topCandidates = rankedGroups.slice(0, 5);
  const categories = ['best', 'best', 'stretch', 'safe', 'safe'];

  const recommendations = topCandidates.map((item, index) => {
    const grp = item.group;
    const cat = categories[index] || 'safe';
    let reason = '';

    if (cat === 'best') {
      reason = `Your quiz responses demonstrate strong affinity for ${grp.subjects.slice(0, 3).join(', ')}. This aligns with your highest interest patterns and provides direct pathways into ${grp.coursesAfter12th.slice(0, 2).join(' and ')}.`;
      if (tenthMarks?.maths && tenthMarks.maths >= 70) {
        reason += ` Your 10th standard score of ${tenthMarks.maths} in Mathematics supports this stream.`;
      }
    } else if (cat === 'stretch') {
      reason = `This stream offers ambitious career scope in ${grp.privateCareers.slice(0, 2).join(' and ')}. It requires dedicated preparation for exams like ${grp.entranceExams.slice(0, 2).join(' / ')}, offering high long-term rewards.`;
    } else {
      reason = `A reliable, balanced pathway focusing on ${grp.subjects[0]} and ${grp.subjects[1]}. It maintains strong public sector career eligibility such as ${grp.govtCareers[0] || 'State service exams'}.`;
    }

    return {
      id: grp.groupId,
      name: grp.name,
      category: cat,
      reason,
      matchScore: Math.max(50, Math.min(98, item.score))
    };
  });

  const topName = topCandidates[0]?.group?.name || 'Higher Secondary Group';
  const summary = `Based on your responses across Aptitude, Interests, and Subject Strengths, ${topName} emerges as your top recommendation. We have curated 2 Best-fit options, 1 High-growth Stretch option, and 2 Safe foundation options tailored to your profile.`;

  return { recommendations, summary };
};

/**
 * Scores polytechnic diploma courses based on student interest tags.
 */
export const scoreDiplomaCourses = ({ courses, interests = [] }) => {
  const interestSet = new Set(interests.map((t) => t.toLowerCase().trim()));

  const rankedCourses = courses.map((course) => {
    const tags = course.interestTags || [];
    let matchCount = 0;

    tags.forEach((tag) => {
      if (interestSet.has(tag.toLowerCase())) matchCount++;
    });

    const matchRatio = interestSet.size > 0 ? matchCount / interestSet.size : 0;
    const baseScore = matchCount > 0 ? Math.round(55 + matchRatio * 40) : 35;
    const finalScore = Math.max(20, Math.min(96, baseScore));

    return {
      course,
      matchScore: finalScore,
      matchedTags: tags.filter((t) => interestSet.has(t.toLowerCase()))
    };
  });

  return rankedCourses.sort((a, b) => b.matchScore - a.matchScore);
};

/**
 * Builds deterministic fallback recommendations for diploma courses.
 */
export const buildFallbackDiplomaRecommendations = ({ rankedCourses, interests }) => {
  const topCandidates = rankedCourses.slice(0, 5);
  const categories = ['best', 'best', 'stretch', 'safe', 'safe'];

  const recommendations = topCandidates.map((item, index) => {
    const c = item.course;
    const cat = categories[index] || 'safe';
    const tagList = item.matchedTags.length > 0 ? item.matchedTags.join(', ') : 'technical hands-on';

    let reason = '';
    if (cat === 'best') {
      reason = `Matches your selected interests in [${tagList}]. Offers excellent direct employment in roles like ${c.careers.slice(0, 2).join(' and ')}, plus lateral entry into B.E./B.Tech 2nd year.`;
    } else if (cat === 'stretch') {
      reason = `Demands specialized analytical precision in ${c.name}. Prepares you for prestigious public sector opportunities such as ${c.govtCareers.slice(0, 2).join(' or ')}.`;
    } else {
      reason = `A reliable, steady vocational qualification with strong industrial demand across Tamil Nadu manufacturing and engineering clusters.`;
    }

    return {
      id: c.courseId,
      name: c.name,
      category: cat,
      reason,
      matchScore: item.matchScore
    };
  });

  const summary = `Based on your interest in ${interests.join(', ')}, we identified the top polytechnic diploma pathways in Tamil Nadu with strong industry hiring and lateral entry college options.`;

  return { recommendations, summary };
};
