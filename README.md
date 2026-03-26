# Academic Programming Laboratory Management System (APLMS)

![Logo](https://img.shields.io/badge/APLMS-v1.0.0-blue)

APLMS is a comprehensive web-based platform designed to streamline academic programming laboratory sessions. It provides an integrated environment for students to code, submit assignments, and for faculty to evaluate and manage student performance efficiently.

## 🚀 Key Features

### 👨‍🎓 For Students
- **Interactive Coding Environment**: Write and test code directly in the integrated IDE.
- **Dynamic Terminal**: Real-time execution and output viewing.
- **Assignment Tracking**: Stay updated with pending, submitted, and verified assignments.
- **Performance Overview**: Track progress through a personalized student dashboard.

### 👩‍🏫 For Faculty
- **AI-Powered Evaluation**: Automated code review using Groq (Llama 3.3) that analyzes logic, output correctness, and code structure.
- **Effortless Review**: Detailed submission viewing with an integrated evaluation drawer and real-time execution verification.
- **Comprehensive Dashboard**: Track active labs and total submissions across all supervised sessions.
- **Cascading Management**: Delete experiments and labs with full cleanup of student submissions.

### 👨‍💼 For Admins
- **Full User Management**: Specialized tabs for Faculty and Students with secure account creation (Auth + Firestore).
- **Class Organization**: Manage class lists and dynamically assign students to their respective groups.
- **Data Integrity**: Comprehensive cascading delete system that wipes all associated records when a lab, class, or user is removed.
- **Performance Overview**: System-wide statistics on active sessions and user counts.

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla CSS3, JavaScript.
- **Shell**: [Electron](https://www.electronjs.org/) (handles local process execution and secure IPC).
- **AI Engine**: [Groq API](https://groq.com/) (using Llama 3.3 70B for high-speed, intelligent code evaluation).
- **Backend/Auth**: [Firebase](https://firebase.google.com/) (Authentication & Firestore for real-time synchronization).
- **Local Runner**: Integrated Node.js environment supporting Python, C, C++, Java, and JavaScript.

## 📂 Project Structure

- `backend/`: Supporting logic for local execution environments.
- `css/`: Modern design system including dashboards, coding screens, and interactive drawers.
- `pages/`: Specialized HTML modules for Students, Faculty, and Admin workflows.
- `main.js`: Main Electron process handling OS-level interactions and AI API bridging.
- `preload.js`: Secure IPC layer exposing localized APIs to the renderer.

## 🚦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your system.
- [GCC/G++](https://gcc.gnu.org/) (for C/C++ execution).
- [Python 3](https://www.python.org/) installed and added to PATH.
- [Java Development Kit (JDK)](https://www.oracle.com/java/technologies/downloads/) (for Java execution).

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/SpaceOfAbhi/Academic-programming-laboratory-management-system.git
   ```
2. Navigate to the project directory:
   ```bash
   cd Academic-programming-laboratory-management-system
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application
#### 1. Start the Runner Server
The runner server handles local code execution. Open a separate terminal and run:
```bash
cd backend
npm install
```

#### 2. Launch APLMS
Run the Electron application:
```bash
npm start
```

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
