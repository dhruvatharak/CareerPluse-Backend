/**
 * CareerPulse AI - Database Seed Script
 * Reads CSV datasets from backend/src/dataset, maps data types, and upserts into MongoDB.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, closeDB } from '../config/db.js';
import { loadCSV } from '../helpers/csvLoader.js';

// Models
import District from '../models/District.js';
import Group from '../models/Group.js';
import School from '../models/School.js';
import GovJob from '../models/GovJob.js';
import QuizQuestion from '../models/QuizQuestion.js';
import DiplomaCourse from '../models/DiplomaCourse.js';
import DiplomaCollege from '../models/DiplomaCollege.js';
import Course from '../models/Course.js';
import College from '../models/College.js';
import CollegeCourse from '../models/CollegeCourse.js';
import MedicalCutoff from '../models/MedicalCutoff.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATASET_DIR = path.resolve(__dirname, '../dataset');

export const runSeed = async () => {
  // Production safety check: require explicit confirmation flag
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--confirm')) {
    console.error('====================================================');
    console.error('⛔ [SECURITY BLOCK]: In production, seeding updates live collections.');
    console.error('To proceed, run with explicit confirmation:');
    console.error('  npm run seed -- --confirm');
    console.error('====================================================');
    process.exit(1);
  }

  console.log('====================================================');
  console.log('🌱 Starting CareerPulse AI Database Seed...');
  console.log(`📂 Dataset Folder: ${DATASET_DIR}`);
  console.log('====================================================');

  await connectDB();

  try {
    // 1. Seed Districts
    const districtsData = await loadCSV(path.join(DATASET_DIR, 'districts.csv'));
    if (districtsData && districtsData.length > 0) {
      let count = 0;
      for (const item of districtsData) {
        if (!item.districtId || !item.name) continue;
        await District.findOneAndUpdate(
          { districtId: item.districtId },
          { $set: item },
          { upsert: true, new: true }
        );
        count++;
      }
      console.log(`✓ Districts seeded/upserted: ${count} rows`);
    }

    // 2. Seed Groups
    const groupsData = await loadCSV(path.join(DATASET_DIR, 'groups.csv'), {
      arrayFields: [
        'subjects',
        'coursesAfter12th',
        'entranceExams',
        'govtCareers',
        'privateCareers',
        'higherStudies'
      ],
      numberFields: ['minMarks'],
      booleanFields: ['isSample']
    });

    if (groupsData && groupsData.length > 0) {
      let count = 0;
      for (const item of groupsData) {
        if (!item.groupId) continue;
        await Group.findOneAndUpdate(
          { groupId: item.groupId },
          { $set: item },
          { upsert: true, new: true }
        );
        count++;
      }
      console.log(`✓ Higher Secondary Groups seeded/upserted: ${count} rows`);
    }

    // 3. Seed Schools
    const schoolsData = await loadCSV(path.join(DATASET_DIR, 'schools.csv'), {
      numberFields: ['passPercentage12th', 'centumCount'],
      booleanFields: ['isSample']
    });

    if (schoolsData && schoolsData.length > 0) {
      let count = 0;
      for (const item of schoolsData) {
        if (!item.schoolId) continue;
        await School.findOneAndUpdate(
          { schoolId: item.schoolId },
          { $set: item },
          { upsert: true, new: true }
        );
        count++;
      }
      console.log(`✓ Schools seeded/upserted: ${count} rows`);
    }

    // 4. Seed Government Jobs
    const jobsData = await loadCSV(path.join(DATASET_DIR, 'govjobs.csv'), {
      booleanFields: ['isSample']
    });

    if (jobsData && jobsData.length > 0) {
      let count = 0;
      for (const item of jobsData) {
        if (!item.jobId) continue;
        await GovJob.findOneAndUpdate(
          { jobId: item.jobId },
          { $set: item },
          { upsert: true, new: true }
        );
        count++;
      }
      console.log(`✓ Government Jobs seeded/upserted: ${count} rows`);
    }

    // 5. Seed Quiz Questions
    const quizData = await loadCSV(path.join(DATASET_DIR, 'quiz_questions.csv'), {
      booleanFields: ['isSample']
    });

    if (quizData && quizData.length > 0) {
      let count = 0;
      for (const item of quizData) {
        if (!item.questionId) continue;
        await QuizQuestion.findOneAndUpdate(
          { questionId: item.questionId },
          { $set: item },
          { upsert: true, new: true }
        );
        count++;
      }
      console.log(`✓ Quiz Questions seeded/upserted: ${count} rows`);
    }

    // 6. Seed Diploma Courses
    const diplomaCoursesData = await loadCSV(path.join(DATASET_DIR, 'diploma_courses.csv'), {
      arrayFields: ['interestTags', 'careers', 'higherStudies', 'govtCareers'],
      booleanFields: ['isSample']
    });

    if (diplomaCoursesData && diplomaCoursesData.length > 0) {
      let count = 0;
      for (const item of diplomaCoursesData) {
        if (!item.courseId) continue;
        await DiplomaCourse.findOneAndUpdate(
          { courseId: item.courseId },
          { $set: item },
          { upsert: true, new: true }
        );
        count++;
      }
      console.log(`✓ Diploma Courses seeded/upserted: ${count} rows`);
    }

    // 7. Seed Diploma Colleges
    const diplomaCollegesData = await loadCSV(path.join(DATASET_DIR, 'diploma_colleges.csv'), {
      arrayFields: ['courses'],
      booleanFields: ['isSample']
    });

    if (diplomaCollegesData && diplomaCollegesData.length > 0) {
      let count = 0;
      for (const item of diplomaCollegesData) {
        if (!item.collegeId) continue;
        await DiplomaCollege.findOneAndUpdate(
          { collegeId: item.collegeId },
          { $set: item },
          { upsert: true, new: true }
        );
        count++;
      }
      console.log(`✓ Diploma Colleges seeded/upserted: ${count} rows`);
    }

    // 8. Seed Degree Courses
    const coursesData = await loadCSV(path.join(DATASET_DIR, 'courses.csv'), {
      arrayFields: ['whatYouStudy', 'careers', 'govtCareers', 'higherStudies'],
      booleanFields: ['requiresJEE', 'requiresNEET', 'isSample']
    });

    if (coursesData && coursesData.length > 0) {
      let count = 0;
      for (const item of coursesData) {
        if (!item.courseId) continue;
        await Course.findOneAndUpdate(
          { courseId: item.courseId },
          { $set: item },
          { upsert: true, new: true }
        );
        count++;
      }
      console.log(`✓ Degree Courses seeded/upserted: ${count} rows`);
    }

    // 9. Seed Degree Colleges
    const collegesData = await loadCSV(path.join(DATASET_DIR, 'colleges.csv'), {
      booleanFields: ['isSample']
    });

    if (collegesData && collegesData.length > 0) {
      let count = 0;
      for (const item of collegesData) {
        if (!item.collegeId) continue;
        await College.findOneAndUpdate(
          { collegeId: item.collegeId },
          { $set: item },
          { upsert: true, new: true }
        );
        count++;
      }
      console.log(`✓ Colleges seeded/upserted: ${count} rows`);
    }

    // 10. Seed College Courses & Cutoffs
    const collegeCoursesData = await loadCSV(path.join(DATASET_DIR, 'college_courses.csv'), {
      numberFields: ['prevCutoff', 'intake', 'admitted', 'fees', 'hostel'],
      booleanFields: ['isSample']
    });

    if (collegeCoursesData && collegeCoursesData.length > 0) {
      let count = 0;
      for (const item of collegeCoursesData) {
        if (!item.collegeId || !item.courseId || !item.academicYear) continue;
        await CollegeCourse.findOneAndUpdate(
          {
            collegeId: item.collegeId,
            courseId: item.courseId,
            academicYear: item.academicYear
          },
          { $set: item },
          { upsert: true, new: true }
        );
        count++;
      }
      console.log(`✓ College Courses & Cutoffs seeded/upserted: ${count} rows`);
    }

    // 11. Seed Medical Cutoffs Reference Bands
    const medicalCutoffsData = await loadCSV(path.join(DATASET_DIR, 'medical_cutoffs.csv'), {
      numberFields: ['minNeetScore', 'maxNeetScore'],
      booleanFields: ['isSample']
    });

    if (medicalCutoffsData && medicalCutoffsData.length > 0) {
      let count = 0;
      for (const item of medicalCutoffsData) {
        if (!item.category || !item.courseId || !item.academicYear) continue;
        await MedicalCutoff.findOneAndUpdate(
          {
            category: item.category,
            courseId: item.courseId,
            academicYear: item.academicYear
          },
          { $set: item },
          { upsert: true, new: true }
        );
        count++;
      }
      console.log(`✓ Medical Cutoff Reference Bands seeded/upserted: ${count} rows`);
    }

    console.log('🔄 Synchronizing database indexes...');
    await Promise.all([
      District.syncIndexes(),
      Group.syncIndexes(),
      School.syncIndexes(),
      GovJob.syncIndexes(),
      QuizQuestion.syncIndexes(),
      DiplomaCourse.syncIndexes(),
      DiplomaCollege.syncIndexes(),
      Course.syncIndexes(),
      College.syncIndexes(),
      CollegeCourse.syncIndexes(),
      MedicalCutoff.syncIndexes()
    ]);
    console.log('✓ All collection indexes successfully synchronized.');

    console.log('====================================================');
    console.log('🎉 Database Seeding Completed Successfully!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Seeding failed with error:', err);
    throw err;
  } finally {
    await closeDB();
  }
};

// Auto-run if executed directly via npm run seed
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
