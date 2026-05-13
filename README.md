# JD Resume Builder

A full-stack web application that helps you generate a tailored, ATS-friendly resume based on a Job Description (JD) using DeepSeek AI.

## Features
- **Private Access**: Password-protected entry gate for personal use.
- **Base Resume Storage**: Store your master resume and use it as a foundation for tailoring.
- **AI Tailoring**: Leverage DeepSeek's `deepseek-chat` model to rewrite, reorder, and optimize your resume for specific job descriptions while preserving truthfulness.
- **History Tracking**: Automatically saves all generated resumes to a MongoDB database.
- **Markdown & JSON Output**: View your resume beautifully formatted, copy to clipboard, or download as a Markdown file.
- **Modern UI**: Built with Next.js 15 App Router, Tailwind CSS, and Lucide Icons, featuring dark mode, glassmorphism, and responsive design.

## Technology Stack
- **Frontend**: Next.js 15, React, Tailwind CSS v4, Lucide React
- **Backend**: Next.js API Routes, Server Actions
- **Database**: MongoDB (via Mongoose)
- **AI Provider**: DeepSeek
- **Deployment target**: Vercel

## Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- npm or yarn
- A MongoDB cluster (free tier on MongoDB Atlas is fine) or a local instance
- DeepSeek API key

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in the following variables in `.env.local`:
- `SITE_PASSWORD`: The password you want to use to access the app.
- `MONGODB_URI`: Your MongoDB connection string.
- `DEEPSEEK_API_KEY`: Your DeepSeek API key.

### 4. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel
1. Push your code to a GitHub repository.
2. Go to [Vercel](https://vercel.com/) and create a new project from your repository.
3. In the project settings, add the Environment Variables from your `.env.local` file.
4. Deploy!

## Future Improvements
- Multi-user authentication (NextAuth/Clerk) instead of a simple password gate.
- PDF generation (using `react-pdf` or a headless browser).
- Direct integration to apply for jobs.
