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
- **Effortless Evaluation**: Review student code and verify outputs with ease.
- **Comprehensive Dashboard**: Real-time statistics on total submissions and student performance.
- **Assignment Management**: Create and manage programming assignments across different subjects.
- **Plagiarism Detection**: Tools to ensure code integrity and originality.

### 👨‍💼 For Admins
- **User Management**: Efficiently manage student and faculty accounts.
- **System Configuration**: Fine-tune system settings for optimal performance.
- **Activity Monitoring**: Oversee overall system usage and health.

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla for maximum control)
- **Framework**: Electron (for local code execution and desktop capabilities)
- **Backend**: Node.js, Express
- **Database**: Firebase Firestore (for real-time data synchronization)
- **Local Runner**: Custom Node.js runner server for multi-language execution (Python, C, C++, Java, Node.js).

## 📂 Project Structure

- `backend/`: Server-side logic for code execution and Firebase configuration.
- `css/`: Styling assets for a modern and responsive UI.
- `pages/`: HTML files for different user interfaces (Dashboards, IDE, Review, etc.).
- `main.js`: Entry point for the Electron application.
- `preload.js`: Electron preload script for secure IPC communication.

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
node server.js
```
The server will start listening on `http://localhost:5000`.

#### 2. Launch APLMS
Run the Electron application:
```bash
npm start
```

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
