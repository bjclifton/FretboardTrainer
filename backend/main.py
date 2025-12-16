"""Main application file for the FastAPI backend."""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dsp import AudioAnalyzer

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/audio")
async def audio_endpoint(websocket: WebSocket, rate: int = 44100):
    """Handles WebSocket connections for audio data."""
    await websocket.accept()
    print(f"Client connected with sample rate: {rate}")
    analyzer = AudioAnalyzer(rate=rate)

    try:
        while True:
            # 1. Receive Binary Blob from Browser
            data = await websocket.receive_bytes()

            # 2. Process
            frequency = analyzer.process(data)

            # 3. Send Result
            # FIX: Send response even if 0.0 so frontend updates
            await websocket.send_json({
                "frequency": round(frequency, 2),
                "note": "--"
            })

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Server Error: {e}")