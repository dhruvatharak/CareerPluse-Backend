# CareerPulse AI – Tamil Nadu Educational Datasets

All data in this directory is **SAMPLE data for demonstration purposes**.

To use production data:
1. Replace the CSV files with official records from verified sources:
   - **Higher Secondary Groups** (`groups.csv`): Directorate of Government Examinations (DGE Tamil Nadu)
   - **Schools Performance** (`schools.csv`): School Education Department, Government of Tamil Nadu
   - **Govt Jobs** (`govjobs.csv`): Official recruitment notifications (TNPSC, MRB, TRB, Staff Selection Commission, Indian Railways)
   - **Polytechnic Diploma Courses** (`diploma_courses.csv`): Directorate of Technical Education (DOTE Tamil Nadu)
   - **Polytechnic Colleges** (`diploma_colleges.csv`): Directorate of Technical Education (DOTE Tamil Nadu)
   - **Aptitude Quiz Questions** (`quiz_questions.csv`): Tamil Nadu SCERT & Vocational Guidance Bureau
   - **Undergraduate Degree Courses** (`courses.csv`): AICTE / NMC / UGC / TNEA / Anna University curriculum catalogs
   - **Colleges & Universities** (`colleges.csv`): TNEA Directorate, Directorate of Medical Education (DME), and University affiliations
   - **College Courses & Cutoffs** (`college_courses.csv`): Official TNEA Round Closing Ranks, DME Allotment lists, and JoSAA Opening/Closing Ranks
   - **Medical Reference Cutoff Ranges** (`medical_cutoffs.csv`): DME Tamil Nadu State Quota Medical & Dental allotment records
   - **Districts** (`districts.csv`): Official 38 Revenue Districts of Tamil Nadu
2. Retain the exact CSV headers.
3. Set `isSample=false` in each row.
4. Run the seed script:
   ```bash
   cd backend
   npm run seed
   ```

---

## 12th Standard Cutoff Calculation Formulas

### 1. TNEA Engineering Cutoff (Out of 200)
$$\text{TNEA Cutoff} = \frac{\text{Mathematics}}{2} + \frac{\text{Physics}}{4} + \frac{\text{Chemistry}}{4}$$
- Mathematics carries 100 marks weightage.
- Physics carries 50 marks weightage.
- Chemistry carries 50 marks weightage.
- Calculated to 2 decimal places.

### 2. Relevant Subject Average
Calculates stream-specific academic strength:
- **Engineering**: $(\text{Maths} + \text{Physics} + \text{Chemistry}) / 3$
- **Medical**: $(\text{Physics} + \text{Chemistry} + \text{Biology}) / 3$
- **Commerce**: Average of entered Commerce subjects (Accountancy, Economics, Commerce, Business Maths)

### 3. Medical NEET Score Band
NEET scores (out of 720) are matched against previous DME allotment bands for the student's category (`OC`, `BC`, `BCM`, `MBC`, `SC`, `SCA`, `ST`) to report:
- `Above previous cutoff range`
- `Within previous cutoff range`
- `Below previous cutoff range`

---

## Free OpenAI-Compatible LLM Providers & Fallback Engine

CareerPulse AI uses two free OpenAI-compatible LLM providers with automatic fallback:
1. **Groq** (Primary provider): `https://api.groq.com/openai/v1/chat/completions` (e.g. `qwen/qwen3.8-27b` or `llama-3.3-70b-versatile`)
2. **Gemini** (Secondary provider): `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` (e.g. `gemini-1.5-flash`)
3. **Deterministic Rule-based Engine** (Final fallback if both providers fail or are unconfigured)

### 1. How to Set Your API Keys
In `backend/.env`, set:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_MODEL=qwen/qwen3.8-27b
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
GEMINI_MODEL=gemini-1.5-flash
LLM_TIMEOUT_MS=30000
```

### 2. Verify Providers via Test Script
Run the test command in the `backend/` folder:
```bash
npm run test:llm
```
This tests each configured provider separately and prints the URL, model, HTTP status, and success/failure.

### 3. Fallback Engine (Zero Crash Guarantee)
If a provider key is missing, it is skipped. If a provider encounters HTTP 429, 5xx, timeout, network error, invalid JSON, or no valid IDs:
- The system automatically tries the next provider (Groq -> Gemini -> Rule-based fallback).
- The user **never** experiences a crash or broken UI.
- Recommendations store `generatedBy: 'groq' | 'gemini' | 'fallback'`.
- Badges show: `"AI-generated (Groq)"`, `"AI-generated (Gemini)"`, or `"Rule-based (AI unavailable)"`.
- In `NODE_ENV=development`, hovering over the badge displays the exact `fallbackReason` tooltip.
