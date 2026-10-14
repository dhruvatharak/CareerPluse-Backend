/**
 * CareerPulse AI - Phase 4 Integration Test Script
 */

import http from 'http';
import app from '../app.js';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import CutoffRecord from '../models/CutoffRecord.js';
import Favorite from '../models/Favorite.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const runVerification = async () => {
  await connectDB();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5099, resolve));
  const baseUrl = 'http://127.0.0.1:5099/api';

  try {
    console.log('--- Step 1: Prepare Test Student ---');
    let testUser = await User.findOne({ email: 'phase4test@careerpulse.tn' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Phase 4 Student',
        email: 'phase4test@careerpulse.tn',
        password: 'password123',
        district: 'Chennai',
        category: 'BC'
      });
    }

    const token = jwt.sign(
      { id: testUser._id, email: testUser.email, role: 'student' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    // Clean any prior cutoff record for clean test
    await CutoffRecord.deleteOne({ user: testUser._id });
    await Favorite.deleteMany({ user: testUser._id });

    console.log('--- Step 2: GET /api/cutoff/me (Expect null initially) ---');
    const meRes = await fetch(`${baseUrl}/cutoff/me`, { headers });
    const meData = await meRes.json();
    console.log('Initial cutoff/me data:', meData.data);
    if (meData.data !== null) throw new Error('Expected cutoff/me to be null initially');

    console.log('--- Step 3: POST /api/cutoff/calculate (Engineering marks: Maths 90, Physics 80, Chemistry 80) ---');
    const calcPayload = {
      stream: 'Engineering',
      twelfthMarks: {
        maths: 90,
        physics: 80,
        chemistry: 80,
        computerScience: 95
      },
      jee: {
        score: 180,
        rank: 12500
      }
    };
    const calcRes = await fetch(`${baseUrl}/cutoff/calculate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(calcPayload)
    });
    const calcData = await calcRes.json();
    console.log('Calculated Cutoff:', calcData.data?.results);
    const expectedTnea = 85.0; // 90/2 + 80/4 + 80/4 = 45 + 20 + 20 = 85.0
    if (calcData.data?.results?.tneaCutoff !== expectedTnea) {
      throw new Error(`Expected TNEA cutoff ${expectedTnea}, got ${calcData.data?.results?.tneaCutoff}`);
    }

    console.log('--- Step 4: GET /api/courses/top ---');
    const topCoursesRes = await fetch(`${baseUrl}/courses/top?limit=5`, { headers });
    const topCoursesData = await topCoursesRes.json();
    console.log(`Retrieved ${topCoursesData.data?.length} top courses. #1 is ${topCoursesData.data?.[0]?.name} (${topCoursesData.data?.[0]?.totalAdmitted} admitted)`);
    if (!topCoursesData.data || topCoursesData.data.length === 0) {
      throw new Error('No top courses returned');
    }

    console.log('--- Step 5: GET /api/courses/:courseId (CRS-ENG-01) ---');
    const courseRes = await fetch(`${baseUrl}/courses/CRS-ENG-01`, { headers });
    const courseData = await courseRes.json();
    console.log(`Course details for ${courseData.data?.course?.name}: offered in ${courseData.data?.colleges?.length} colleges`);
    if (!courseData.data?.course) throw new Error('Course details not found');

    console.log('--- Step 6: GET /api/colleges with Exam filters ---');
    const jeeCollegesRes = await fetch(`${baseUrl}/colleges?exam=jee`, { headers });
    const jeeColleges = await jeeCollegesRes.json();
    console.log(`Colleges with JEE: ${jeeColleges.data?.colleges?.length}`);

    const neetCollegesRes = await fetch(`${baseUrl}/colleges?exam=neet`, { headers });
    const neetColleges = await neetCollegesRes.json();
    console.log(`Colleges with NEET: ${neetColleges.data?.colleges?.length}`);

    const withoutNeetCollegesRes = await fetch(`${baseUrl}/colleges?exam=withoutNeet`, { headers });
    const withoutNeetColleges = await withoutNeetCollegesRes.json();
    console.log(`Colleges without NEET: ${withoutNeetColleges.data?.colleges?.length}`);

    console.log('--- Step 7: GET /api/colleges/COL-01 (Inspect student chance evaluation) ---');
    const collegeDetailRes = await fetch(`${baseUrl}/colleges/COL-01`, { headers });
    const collegeDetail = await collegeDetailRes.json();
    const cegCourses = collegeDetail.data?.courses || [];
    console.log(`COL-01 (CEG) has ${cegCourses.length} courses.`);
    console.log('Sample course chance evaluation:', {
      name: cegCourses[0]?.name,
      cutoffType: cegCourses[0]?.cutoffType,
      prevCutoff: cegCourses[0]?.prevCutoff,
      studentValue: cegCourses[0]?.studentValue,
      chanceLabel: cegCourses[0]?.chanceLabel,
      chanceVariant: cegCourses[0]?.chanceVariant,
      trendsCount: cegCourses[0]?.trends?.length
    });
    if (!cegCourses[0]?.chanceLabel) {
      throw new Error('Expected chanceLabel in college course');
    }

    console.log('--- Step 8: Bookmark Degree College (itemType=degreeCollege) ---');
    const favRes = await fetch(`${baseUrl}/favorites`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ itemType: 'degreeCollege', itemId: 'COL-01' })
    });
    const favData = await favRes.json();
    console.log('Favorite added:', favData.success);

    console.log('--- Step 9: GET /api/users/profile (Verify cutoffRecord and degreeColleges favorite) ---');
    const profileRes = await fetch(`${baseUrl}/users/profile`, { headers });
    const profileData = await profileRes.json();
    console.log('Profile Cutoff Record TNEA:', profileData.data?.cutoffRecord?.results?.tneaCutoff);
    console.log('Profile Saved Degree Colleges:', profileData.data?.favorites?.degreeColleges?.map(c => c.name));
    if (!profileData.data?.cutoffRecord) throw new Error('CutoffRecord missing in profile response');
    if (!profileData.data?.favorites?.degreeColleges?.some(c => c.collegeId === 'COL-01')) {
      throw new Error('degreeCollege COL-01 missing in profile favorites');
    }

    console.log('--- Step 10: Switch to Medical Stream with NEET score 620 ---');
    const medCalcRes = await fetch(`${baseUrl}/cutoff/calculate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        stream: 'Medical',
        twelfthMarks: { physics: 85, chemistry: 85, biology: 90 },
        neet: { score: 620 }
      })
    });
    const medData = await medCalcRes.json();
    console.log('Medical NEET Results:', {
      neetScore: medData.data?.results?.neetScore,
      neetBand: medData.data?.results?.neetBand
    });
    if (!medData.data?.results?.neetBand) {
      throw new Error('NEET band not calculated');
    }

    console.log('\n===========================================');
    console.log('✅ ALL PHASE 4 INTEGRATION TESTS PASSED!');
    console.log('===========================================\n');
  } finally {
    server.close();
    process.exit(0);
  }
};

runVerification().catch((err) => {
  console.error('❌ Phase 4 Verification Failed:', err);
  process.exit(1);
});
