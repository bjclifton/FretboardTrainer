"""Main application file for the FastAPI backend."""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dsp import AudioAnalyzer

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev only. In prod, specify
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/audio")
async def audio_endpoint(websocket: WebSocket, rate: int = 44100):
    """Handles WebSocket connections for audio data."""
    await websocket.accept()
    print("Client connected")
    analyzer = AudioAnalyzer(rate=rate)

    try:
        while True:
            # 1. Receive Binary Blob from Browser
            data = await websocket.receive_bytes()

            # 2. Process
            frequency = analyzer.process(data)

            # 3. Send Result
            # Only send if we actually detected something to save bandwidth
            if frequency > 20:
                await websocket.send_json({
                    "frequency": round(frequency, 2),
                    "note": "TODO" # We'll do note mapping in frontend
                })

    except WebSocketDisconnect:
        print("Client disconnected")
    except RuntimeError as e:
        print(f"Error: {e}")
