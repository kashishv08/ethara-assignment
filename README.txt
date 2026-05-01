🚀 Ethara Team Task Manager

A high-performance, full-stack collaborative task management platform designed for modern teams. This application features a robust Role-Based Access Control (RBAC) system, dynamic Kanban boards, and a centralized project dashboard.

🔗 Live Deployment
Live URL: https://ethara-assignment-production-49a2.up.railway.app

---

🔑 Admin Credentials
Use the following credentials to access the platform with full Global Admin privileges:

- Email: tulsi@gmail.com
- Password: tulsi123

---

🎭 Role-Based Access Control (RBAC)
The core of the application is built on a strict permission model to ensure secure collaboration.

👑 Admin Role
* System Ownership: Total control over the entire workspace.
* Project Management: Create, edit, and archive any project.
* Team Oversight: View all tasks across all projects and manage any team member.
* User Management: Access to a dedicated Admin Panel to promote/deactivate users.

👥 Member Role
* Focused Access: Can only view projects they have been specifically added to.
* Task Management: Can create tasks and edit the details (title, description, priority) of tasks assigned to them.
* Progress Tracking: Can update the status (To-Do -> In Review -> Done) via a drag-and-drop Kanban board.
* Dashboard Stats: Personalized view of their own workload and upcoming deadlines.

---

✨ Key Features
- 📊 Adaptive Dashboard: Real-time stats that change based on your role (Admin vs. Member).
- 📋 Kanban Board: Four-stage workflow (To-Do, In Progress, In Review, Done) with drag-and-drop.
- 🛡️ RBAC UI Guards: Components automatically hide/show buttons based on project-level permissions.
- 🔐 Secure Auth: JWT-based authentication with session persistence.
- ⚡ Modern UI: Sleek dark-mode compatible design using Tailwind CSS and Radix UI.

---

🛠️ Tech Stack
- Frontend: React 18, TypeScript, Vite, TanStack Query, Lucide Icons, Tailwind CSS.
- Backend: Node.js, Express 5, MongoDB (Mongoose), JWT, Zod Validation, Pino Logger.
- Deployment: Railway (Unified Full-Stack Deployment).

---

⚙️ Local Setup

1. Prerequisites
- Node.js (v20+)
- MongoDB Instance (Local or Atlas)

2. Installation
Clone the repository and install dependencies in both folders:
# Install frontend dependencies
cd frontend && npm install --legacy-peer-deps

# Install backend dependencies
cd ../backend && npm install --legacy-peer-deps

3. Environment Configuration
Create a .env file in the backend directory:
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_key
NODE_ENV=development

4. Running the App
Development Mode:
# In backend folder
npm run dev

# In frontend folder
npm run dev

---

🚢 Production Deployment
This project uses a Unified Deployment Strategy. The root package.json contains a specialized build script that compiles the frontend and prepares the backend to serve it as a single service.

Build Command: npm run build
Start Command: npm start
