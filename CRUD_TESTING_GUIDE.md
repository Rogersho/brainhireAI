## BrainHire - Complete CRUD Implementation & Testing Guide

This document provides a comprehensive overview of all CRUD operations implemented and how to test them.

---

## 📋 Implementation Summary

### 1. **Backend API Routes Created**

#### **Jobs CRUD - `/api/jobs/[id]`**
- **GET** - Fetch job by ID with applicant count
- **PUT** - Update job (title, description, skills, status, department, location)
- **DELETE** - Delete job and all associated applicants

#### **Applicants CRUD - `/api/applicants/[id]`**
- **GET** - Fetch applicant by ID (populated with job & user references)
- **PUT** - Update applicant (name, role, status, score, skills, experience, resumeUrl, source)
- **DELETE** - Delete applicant

#### **Existing Routes Enhanced**
- `/api/jobs` - **GET** (all jobs) & **POST** (create job)
- `/api/applicants` - **GET** (filtered by jobId/userId) & **POST** (create applicant)

#### **New Endpoints**
- `/api/notifications` - **GET** - Fetch real notifications based on recent activity (jobs, applicants, shortlists)
- `/api/test-crud` - **GET** - Execute comprehensive CRUD validation test

---

### 2. **Redux State Management Updated**

#### **jobsSlice**
**New Thunks:**
- `fetchJobById(id)` - Get single job
- `createJob(jobData)` - Create new job
- `updateJob({ id, jobData })` - Update existing job
- `deleteJob(id)` - Delete job

**New State Fields:**
- `currentJob` - Stores selected/active job
- `clearError()` - Action to reset error state

#### **applicantsSlice**
**New Thunks:**
- `fetchApplicantsByJob(jobId)` - Get applicants for specific job
- `fetchApplicantById(id)` - Get single applicant
- `createApplicant(applicantData)` - Create new applicant
- `updateApplicant({ id, applicantData })` - Update applicant status/score
- `deleteApplicant(id)` - Delete applicant

**New State Fields:**
- `currentApplicant` - Stores selected applicant
- `clearError()` - Action to reset error state

---

### 3. **Frontend Pages Updated**

#### **Screening Page** (`/screening`)
**Status:** ✅ **REAL DATA** (was: hardcoded mock data)
- Now fetches jobs via Redux
- On job selection, fetches applicants for that job
- Displays applicants sorted by score
- Shows real skills, experience, status from database
- Dynamic fit rating based on score
- Submit status updates to API

#### **Notifications Page** (`/notifications`)
**Status:** ✅ **REAL DATA** (was: hardcoded mock data)
- Fetches notifications from `/api/notifications` API
- Generates alerts based on:
  - Recently posted jobs
  - Recently shortlisted candidates
  - New applications
  - Low response rates on jobs
  - Pending applicants needing review
- Shows unread count badge
- Refresh button to reload notifications

---

## 🧪 Testing Instructions

### **Quick Test - CRUD Validation**
```sh
# Test all CRUD operations in one endpoint
curl http://localhost:3001/api/test-crud
```
**Expected Response:**
```json
{
  "success": true,
  "message": "All CRUD operations passed successfully!",
  "testSummary": {
    "jobCreated": "...",
    "jobUpdated": "...",
    "jobDeleted": true,
    "applicantCreated": "...",
    "applicantUpdated": true,
    "applicantDeleted": true,
    "queriesByJobId": 1
  },
  "databaseStatus": {
    "totalJobsInDB": 3,
    "totalApplicantsInDB": 6,
    "mongoDBConnected": true
  }
}
```

---

### **Testing Individual CRUD Operations**

#### **1. Create a Job**
```http
POST /api/jobs
Content-Type: application/json

{
  "title": "Backend Developer",
  "department": "Engineering",
  "location": "Remote",
  "description": "Seeking an experienced backend engineer",
  "skills": ["Node.js", "TypeScript", "MongoDB"],
  "status": "Active"
}
```

#### **2. Get All Jobs**
```http
GET /api/jobs
```

#### **3. Get Job by ID**
```http
GET /api/jobs/{jobId}
```
**Should return:** job details + applicantCount

#### **4. Update Job**
```http
PUT /api/jobs/{jobId}
Content-Type: application/json

{
  "title": "Senior Backend Developer",
  "status": "Paused"
}
```

#### **5. Delete Job**
```http
DELETE /api/jobs/{jobId}
```
**Note:** This also deletes all applicants for this job

---

#### **6. Create an Applicant**
```http
POST /api/applicants
Content-Type: application/json

{
  "name": "John Doe",
  "jobId": "{jobId}",
  "role": "Backend Developer",
  "score": 88,
  "status": "Pending",
  "source": "LinkedIn",
  "skills": ["Node.js", "TypeScript"],
  "experience": "5 years"
}
```

#### **7. Get Applicants by Job**
```http
GET /api/applicants?jobId={jobId}
```

#### **8. Get Applicant by ID**
```http
GET /api/applicants/{applicantId}
```
**Should return:** applicant details with populated job info

#### **9. Update Applicant (Change Status/Score)**
```http
PUT /api/applicants/{applicantId}
Content-Type: application/json

{
  "status": "Shortlisted",
  "score": 95
}
```

#### **10. Delete Applicant**
```http
DELETE /api/applicants/{applicantId}
```

---

### **Fetching Real Notifications**
```http
GET /api/notifications
```
**Returns:** Array of up to 10 most recent notifications based on:
- Recently posted jobs
- Recent shortlists
- New applications
- Low applicant counts
- Pending review reminders

---

## 🔗 MongoDB Data Flow

### **Create Job → Create Applicants → Update Status → View in Screening**

```
1. POST /api/jobs → Job inserted in MongoDB
2. POST /api/applicants (with jobId ref) → Applicant inserted
3. GET /api/applicants?jobId={jobId} → Fetch from DB
4. Screening page: Dispatch fetchApplicantsByJob → Redux → Display sorted by score
```

### **Verify CRUD is working:**
- ✅ Create job → check MongoDB job collection
- ✅ Create applicant → check MongoDB applicant collection with jobId reference
- ✅ Update applicant status to "Shortlisted" → Notifications API detects it
- ✅ View Screening page → See applicants sorted by score
- ✅ View Notifications page → See "Candidate Shortlisted" notification

---

## 📊 Database Schema References

### **Job Document**
```javascript
{
  _id: ObjectId,
  title: String,
  department: String,
  location: String,
  description: String,
  skills: [String],
  status: "Active" | "Paused" | "Closed",
  createdAt: Date,
  updatedAt: Date
}
```

### **Applicant Document**
```javascript
{
  _id: ObjectId,
  name: String,
  jobId: ObjectId (ref to Job),
  userId: ObjectId (optional, ref to User),
  role: String,
  score: Number (0-100),
  status: "Pending" | "In Review" | "Shortlisted" | "Rejected",
  source: String,
  skills: [String],
  experience: String,
  resumeUrl: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚀 Next Steps

1. **Test API endpoints** using the CRUD validation test
2. **Verify Dashboard Pages:**
   - Main Dashboard: Jobs & Applicants via Redux ✅
   - Applicants Page: Shows all applicants ✅
   - Screening Page: Filter by job + sort by score ✅
   - Notifications Page: Real-time alerts ✅
   - Jobs Page: Browse all jobs ✅
3. **Test Job Management Workflow:**
   - Create job → See in Jobs page
   - Create applicants → See in Applicants page + Screening page
   - Update applicant status → See updates in Notifications
4. **Bulk operations** (future enhancement):
   - Bulk status updates
   - Bulk deletion
   - Bulk export

---

## 📝 Environment Setup

Ensure `.env.local` has:
```
MONGODB_URI=mongodb+srv://...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
GEMINI_API_KEY=...
```

All CRUD operations depend on MongoDB connection. Test with `/api/test-crud` to verify.

