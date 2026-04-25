# Brainhire AI - Talent Screening Platform

Brainhire AI is a production-grade talent screening application designed for the **Umurava Gemini AI Challenge**. It leverages the **Google Gemini 3 Flash** model to automate the recruitment workflow by scoring, ranking, and providing explainable analysis for job applicants.

## 🚀 Live Demo
[Insert Deployment URL Here]

## ✨ Core Features

### 1. Advanced Job Management
- Create and manage detailed job postings with specific technical requirements and skills.
- Direct recruiter dashboard for monitoring hiring pipelines.

### 2. Intelligent Applicant Ingestion
- **Resume Parsing**: Direct PDF upload functionality using Gemini's multimodal capabilities for high-accuracy text extraction.
- **Bulk Import**: Support for CSV-based talent ingestion.
- **Structured Profiles**: Automated creation of candidate profiles from application data.

### 3. AI Screening Engine (Powered by Gemini 3 Flash)
- **Weighted Scoring**: Evaluates candidates on a 0-100 scale based on skills, experience, and role alignment.
- **Explainable AI**: Provides deep reasoning for every shortlisted candidate, including:
    - **Key Strengths**: Specific areas where the candidate excels.
    - **Gaps / Risks**: Potential deficiencies or areas requiring further interview investigation.
    - **Final Recommendation**: A summarized agentic judgment on the candidate's fit.

### 4. Recruiter Dashboard & Analytics
- Ranked leaderboard of applicants.
- Real-time notification system for new applications and completed screening batches.
- Visual AI Match reports for every candidate.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js (App Router), React 19 |
| **State Management** | Redux Toolkit |
| **Styling** | Tailwind CSS + Framer Motion |
| **Backend** | Next.js API Routes (Node.js/TypeScript) |
| **Database** | MongoDB |
| **AI Layer** | Google Gemini API (Model: `gemini-3-flash-preview`) |

---

## 🏗️ Architecture & AI Flow

1. **Information Retrieval**: The system fetches the Job Description and all relevant candidate data (Parsed Resumes/Profiles).
2. **Agentic Instruction**: A specialized prompt instructs the Gemini 3 Flash agent to act as an Expert Recruiter.
3. **Structured Evaluation**: The system uses **JSON Response Mode** to ensure the AI outputs perfectly structured data for: Match Score, Strengths, Gaps, and Recommendations.
4. **Data Persistence**: Results are stored in MongoDB and pushed to the Recruiter Dashboard via specialized API endpoints.

---

## ⚙️ Local Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd brainhireAI
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   GEMINI_API_KEY=your_google_ai_api_key
   NEXT_PUBLIC_GEMINI_MODEL=gemini-3-flash-preview
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   Open `http://localhost:3000` in your browser.

---

## 👨‍💻 Team: Umurava AI Hackathon
- **Team Roles**: Front-End Engineer, Back-End Engineer, AI Software Engineer.
- **Developed for**: The Gemini AI Challenge (April 2024).
