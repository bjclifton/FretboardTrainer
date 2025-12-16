# Fretboard Trainer

Welcome to the Fretboard Trainer! This application helps you practice identifying and playing notes on a guitar fretboard. It uses your microphone to detect the pitch of the notes you play and provides real-time feedback.

## Features

*   **Real-time Pitch Detection**: Analyzes audio input from your microphone to determine the frequency of played notes.
*   **Interactive Fretboard Practice**: Challenges you to play specific notes on the fretboard.
*   **Visual Feedback**: Provides immediate feedback on pitch accuracy.
*   **Configurable Practice**: Select which strings to practice on.
*   **Audio Input Device Selection**: Choose your preferred microphone for input.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

*   **Node.js** (LTS version recommended) & **npm** (Node Package Manager) - for the frontend.
*   **Python 3.8+** & **pip** (Python Package Installer) - for the backend.
*   A modern web browser (e.g., Chrome, Firefox, Edge) with Web Audio API support.

## Setup

Follow these steps to get the project up and running on your local machine.

### 1. Clone the repository

```bash
git clone <repository_url>
cd FretboardTrainer
```

Replace `<repository_url>` with the actual URL of your repository.

### 2. Backend Setup (Python FastAPI)

The backend is responsible for real-time audio analysis (DSP) and communicating with the frontend via WebSockets.

a.  **Create and Activate a Virtual Environment**:
    It's highly recommended to use a virtual environment to manage Python dependencies.

```bash
    cd backend
    python -m venv .venv
    # On macOS/Linux
    source .venv/bin/activate
    # On Windows
    # .venv\Scripts\activate
```

b.  **Install Python Dependencies**:

```bash
    pip install -r requirements.txt
```

c.  **Run the Backend Server**:

```bash
    uvicorn main:app --reload
```
    The backend server should now be running on `http://127.0.0.1:8000`. You will see output in your terminal indicating that FastAPI is listening.

### 3. Frontend Setup (React with Vite)

The frontend is a React application built with Vite, providing the user interface.

a.  **Install Node.js Dependencies**:

```bash
    cd frontend
    npm install
```

b.  **Run the Frontend Development Server**:

```bash
    npm run dev
```
    This will start the Vite development server, usually on `http://localhost:5173`. Open this URL in your web browser.

## Usage

1.  Ensure both the **backend** and **frontend** servers are running.
2.  Open your web browser and navigate to the frontend URL (e.g., `http://localhost:5173`).
3.  **Allow Microphone Access**: Your browser will likely ask for permission to access your microphone. Grant this permission.
4.  **Select Audio Input**: Choose your desired microphone from the dropdown menu.
5.  **Select Active Strings**: Use the chips to select which guitar strings you want to practice.
6.  **Start Practice**: Click the "Start Practice" button. The application will then display a note and string to play.
7.  **Play the Note**: Play the requested note on your guitar. The application will provide visual feedback on your pitch accuracy.
8.  **End Session**: Click "End Session" to stop the microphone input and reset the game.

## Troubleshooting

*   **"Could not access microphone" error**: Ensure your browser has permission to access the microphone. Check your operating system's privacy settings for microphone access.
*   **No pitch detection / No feedback**:
    *   Verify both the backend (`uvicorn`) and frontend (`npm run dev`) servers are running without errors.
    *   Check your browser's developer console for any `[DEBUG]` messages or errors.
    *   Ensure the selected audio input device is correct and active.
    *   Confirm your microphone is working and picking up sound.
*   **`fastapi` or `uvicorn` import errors (Pylint only)**: These are often Pylint environment issues. As long as `pip install -r requirements.txt` ran successfully, the application should function correctly.
*   **"Backend Ready" / "Connecting..." badge**: If it stays on "Connecting...", ensure the backend server is running and accessible at `http://127.0.0.1:8000`.

---
This `README.md` provides all the necessary information to get started with the Fretboard Trainer. Feel free to contribute or suggest improvements!
