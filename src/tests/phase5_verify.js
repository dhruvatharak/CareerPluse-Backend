/**
 * CareerPulse AI - Phase 5 Integration Test Script
 * Verifies all Phase 5 requirements:
 * 1. Missing marks check (400 "Please add your marks first")
 * 2. Option contradiction checks (NEET + Without NEET, JEE + Without JEE)
 * 3. 12th Career Guide generation (with JEE + Engineering Stream)
 * 4. Verification that numbers match database records exactly (zero hallucination)
 * 5. Attached Government Jobs
 * 6. Career Guide history (GET /api/career-guide/history)
 * 7. Profile API (GET /api/users/profile with stats, favorites, quizAttempts, recommendations)
 * 8. Profile update (PATCH /api/users/profile)
 * 9. Password change and re-authentication (PATCH /api/users/password)
 * 10. Delete recommendation (DELETE /api/recommendations/:id) with 404 security check
 */

import http from 'http';
import app from '../app.js';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import CutoffRecord from '../models/CutoffRecord.js';
import Recommendation from '../models/Recommendation.js';
import Favorite from '../models/Favorite.js';
import CollegeCourse from '../models/CollegeCourse.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import bcrypt from 'bcryptjs';

const runVerification = async () => {
  await connectDB();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5098, resolve));
  const baseUrl = 'http://127.0.0.1:5098/api';

  try {
    console.log('=== Step 1: Prepare Test Users ===');
    await User.deleteMany({ email: { $in: ['phase5test@careerpulse.tn', 'phase5other@careerpulse.tn'] } });

    const testUser = await User.create({
      name: 'Phase 5 Candidate',
      email: 'phase5test@careerpulse.tn',
      password: 'Password@123',
      district: 'Chennai',
      category: 'BC',
      phone: '9876543210'
    });

    const otherUser = await User.create({
      name: 'Other Student',
      email: 'phase5other@careerpulse.tn',
      password: 'Password@123',
      district: 'Madurai',
      category: 'OC'
    });

    const token = jwt.sign(
      { id: testUser._id, email: testUser.email, role: 'student' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const otherToken = jwt.sign(
      { id: otherUser._id, email: otherUser.email, role: 'student' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    console.log('=== Step 2: Test Missing Marks Validation ===');
    // User has no cutoff record yet
    const missingMarksRes = await fetch(`${baseUrl}/career-guide/recommend`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ options: ['Engineering Stream'] })
    });
    const missingMarksData = await missingMarksRes.json();
    console.log('Status code:', missingMarksRes.status, 'Message:', missingMarksData.message);
    if (missingMarksRes.status !== 400 || !missingMarksData.message?.includes('Please add your marks first')) {
      throw new Error(`Expected 400 "Please add your marks first", got ${missingMarksRes.status}: ${missingMarksData.message}`);
    }
    console.log('✔ Missing marks validation passed.');

    console.log('=== Step 3: Test Option Contradictions ===');
    // Save marks first so we reach option validation
    await CutoffRecord.create({
      user: testUser._id,
      stream: 'Engineering',
      twelfthMarks: { maths: 95, physics: 90, chemistry: 90, english: 88, tamil: 85, computerScience: 98 },
      results: {
        tneaCutoff: 185.0,
        totalMarks: 546,
        percentage: 91.0
      },
      jee: {
        score: 180,
        rank: 4500
      }
    });

    // Contradiction 1: NEET + Without NEET
    const neetContraRes = await fetch(`${baseUrl}/career-guide/recommend`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ options: ['NEET', 'Without NEET'] })
    });
    const neetContraData = await neetContraRes.json();
    console.log('NEET contradiction status:', neetContraRes.status, 'Message:', neetContraData.message);
    if (neetContraRes.status !== 400 || !neetContraData.message?.includes('NEET')) {
      throw new Error('NEET contradiction was not blocked with 400');
    }

    // Contradiction 2: JEE + Without JEE
    const jeeContraRes = await fetch(`${baseUrl}/career-guide/recommend`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ options: ['JEE', 'Without JEE'] })
    });
    const jeeContraData = await jeeContraRes.json();
    console.log('JEE contradiction status:', jeeContraRes.status, 'Message:', jeeContraData.message);
    if (jeeContraRes.status !== 400 || !jeeContraData.message?.includes('JEE')) {
      throw new Error('JEE contradiction was not blocked with 400');
    }
    console.log('✔ Option contradiction validations passed.');

    console.log('=== Step 4: Valid Career Guide Generation (JEE + Engineering Stream) ===');
    const guideRes = await fetch(`${baseUrl}/career-guide/recommend`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        options: ['JEE', 'Engineering Stream'],
        district: 'Chennai'
      })
    });
    const guideData = await guideRes.json();
    if (![200, 201].includes(guideRes.status) || !guideData.success) {
      throw new Error(`Failed to generate guide: ${guideData.message}`);
    }
    const { recommendation, govJobs } = guideData.data;
    console.log(`Generated Recommendation type: ${recommendation.type}, generatedBy: ${recommendation.generatedBy}`);
    console.log(`Results count: ${recommendation.results?.length}`);
    console.log(`GovJobs count: ${govJobs?.length}`);

    if (recommendation.type !== 'career-12th') {
      throw new Error(`Expected type 'career-12th', got ${recommendation.type}`);
    }
    if (!['groq', 'gemini', 'fallback'].includes(recommendation.generatedBy)) {
      throw new Error(`Unexpected generatedBy: ${recommendation.generatedBy}`);
    }
    if (!recommendation.results || recommendation.results.length === 0) {
      throw new Error('Recommendation results are empty');
    }

    // Check categories and number verification
    const categoriesFound = new Set(recommendation.results.map((r) => r.category));
    console.log('Categories present:', Array.from(categoriesFound));

    // Verify first recommendation item matches actual database record
    const firstItem = recommendation.results[0];
    console.log('Sample recommendation item:', {
      name: firstItem.name,
      category: firstItem.category,
      prevCutoff: firstItem.prevCutoff,
      cutoffType: firstItem.cutoffType,
      academicYear: firstItem.academicYear,
      matchScore: firstItem.matchScore
    });

    const dbRecord = await CollegeCourse.findOne({
      collegeId: firstItem.collegeId,
      courseId: firstItem.courseId
    });
    if (!dbRecord) {
      throw new Error(`Recommendation returned unknown collegeCourse: ${firstItem.collegeId} ${firstItem.courseId}`);
    }
    if (dbRecord.prevCutoff !== firstItem.prevCutoff) {
      throw new Error(`Hallucination detected! DB cutoff is ${dbRecord.prevCutoff}, recommendation has ${firstItem.prevCutoff}`);
    }
    console.log('✔ Verified zero-hallucination: numbers match database exactly.');

    // Verify GovJobs
    if (!govJobs || govJobs.length === 0) {
      throw new Error('GovJobs array is empty');
    }
    console.log('Sample gov job:', govJobs[0].title, 'Qualification:', govJobs[0].qualificationLevel);
    console.log('✔ GovJobs attached successfully.');

    console.log('=== Step 5: Test GET /api/career-guide/history ===');
    const historyRes = await fetch(`${baseUrl}/career-guide/history`, { headers });
    const historyData = await historyRes.json();
    console.log(`History count: ${historyData.data?.length}`);
    if (!historyData.data || historyData.data.length === 0) {
      throw new Error('History should contain at least 1 recommendation');
    }
    const savedRecId = historyData.data[0]._id;
    console.log('✔ History retrieved successfully. First ID:', savedRecId);

    console.log('=== Step 6: Test GET /api/users/profile ===');
    const profileRes = await fetch(`${baseUrl}/users/profile`, { headers });
    const profileData = await profileRes.json();
    const pData = profileData.data;
    console.log('Profile User:', pData.user?.name);
    console.log('CutoffRecord TNEA:', pData.cutoffRecord?.results?.tneaCutoff);
    console.log('Stats:', pData.stats);
    console.log('Recommendations grouped keys:', Object.keys(pData.recommendations || {}));

    if (!pData.user || !pData.stats || pData.stats.recommendationsCount < 1) {
      throw new Error('Profile response structure invalid or stats incorrect');
    }
    if (!pData.recommendations['career-12th'] || pData.recommendations['career-12th'].length === 0) {
      throw new Error('Grouped recommendations missing career-12th entries');
    }
    console.log('✔ Profile data structure matches all requirements.');

    console.log('=== Step 7: Test PATCH /api/users/profile ===');
    const updateProfileRes = await fetch(`${baseUrl}/users/profile`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        name: 'Phase 5 Candidate Updated',
        district: 'Coimbatore',
        category: 'MBC',
        phone: '9876543299'
      })
    });
    const updateProfileData = await updateProfileRes.json();
    console.log('Update profile response:', updateProfileData.message);
    const updatedUserObj = updateProfileData.data?.user || updateProfileData.data;
    if (updateProfileRes.status !== 200 || updatedUserObj?.district !== 'Coimbatore') {
      throw new Error(`Failed to update user profile: status ${updateProfileRes.status}, district: ${updatedUserObj?.district}`);
    }
    console.log('✔ Profile updated successfully.');

    console.log('=== Step 8: Test PATCH /api/users/password & Re-login ===');
    // Wrong current password
    const wrongPassRes = await fetch(`${baseUrl}/users/password`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        currentPassword: 'WrongPassword1',
        newPassword: 'NewPassword@123'
      })
    });
    if (wrongPassRes.status !== 400) {
      throw new Error('Expected 400 for incorrect current password');
    }

    // Short new password (<8 chars)
    const shortPassRes = await fetch(`${baseUrl}/users/password`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        currentPassword: 'Password@123',
        newPassword: 'short'
      })
    });
    if (shortPassRes.status !== 400) {
      throw new Error('Expected 400 for password less than 8 characters');
    }

    // Successful password update
    const validPassRes = await fetch(`${baseUrl}/users/password`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        currentPassword: 'Password@123',
        newPassword: 'NewPassword@123'
      })
    });
    const validPassData = await validPassRes.json();
    console.log('Password change message:', validPassData.message);
    if (validPassRes.status !== 200) {
      throw new Error(`Failed to change password: ${validPassData.message}`);
    }

    // Verify login with new password
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'phase5test@careerpulse.tn',
        password: 'NewPassword@123'
      })
    });
    const loginData = await loginRes.json();
    if (loginRes.status !== 200 || !loginData.data?.token) {
      throw new Error('Login with new password failed');
    }
    console.log('✔ Password update and re-login verified.');

    console.log('=== Step 9: Test DELETE /api/recommendations/:id ===');
    // Other user tries to delete testUser's recommendation (should be 404)
    const unauthorizedDeleteRes = await fetch(`${baseUrl}/recommendations/${savedRecId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherToken}`
      }
    });
    console.log('Unauthorized delete status:', unauthorizedDeleteRes.status);
    if (unauthorizedDeleteRes.status !== 404) {
      throw new Error(`Expected 404 for unauthorized recommendation deletion, got ${unauthorizedDeleteRes.status}`);
    }

    // Owner deletes recommendation
    const ownerDeleteRes = await fetch(`${baseUrl}/recommendations/${savedRecId}`, {
      method: 'DELETE',
      headers
    });
    const ownerDeleteData = await ownerDeleteRes.json();
    console.log('Owner delete response:', ownerDeleteData.message);
    if (ownerDeleteRes.status !== 200) {
      throw new Error('Failed to delete own recommendation');
    }

    const checkDeleted = await Recommendation.findById(savedRecId);
    if (checkDeleted) {
      throw new Error('Recommendation record was not removed from DB');
    }
    console.log('✔ Recommendation deletion and security checks passed.');

    console.log('\n========================================');
    console.log('🎉 ALL PHASE 5 INTEGRATION TESTS PASSED!');
    console.log('========================================\n');
  } catch (error) {
    console.error('❌ Phase 5 Verification failed:', error);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
};

runVerification();
