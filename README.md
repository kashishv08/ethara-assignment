# Ethara Team Task Manager

A full-stack collaborative task management application built with the MERN stack (MongoDB, Express, React, Node.js).

## 🚀 Live Demo
**Live URL**: [Replace with your Railway URL]

## 🛠️ Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide Icons, Shadcn UI, TanStack Query.
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT Authentication, Pino (Logging), Zod (Validation).
- **Deployment**: Railway

## 📦 Submission Details
- **GitHub Repository**: [Replace with your GitHub Repository URL]
- **Deployment**: [Replace with your Railway URL]

## 🛠️ Local Setup

### 1. Prerequisites
- Node.js (v20+)
- MongoDB (Local or Atlas)

### 2. Backend Setup
1. Navigate to the `backend` folder.
2. Create a `.env` file with:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_secret_key
   NODE_ENV=development
   ```
3. Run `npm install`.
4. Run `npm run dev`.

### 3. Frontend Setup
1. Navigate to the `frontend` folder.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:5173` in your browser.

## 🚢 Production Deployment (Railway)
The project is configured for unified deployment.
1. Connect your GitHub repository to Railway.
2. Set the environment variables (`MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`).
3. Railway will build and serve the application automatically.
