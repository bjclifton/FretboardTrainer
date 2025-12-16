# Product Requirement Document: Fretboard Audio Analysis Service

## 1. Executive Summary

**Service Name:** Fretboard DSP Engine
**Objective:** Provide a high-performance, real-time audio analysis backend that accepts raw audio streams via WebSockets, performs pitch detection using Fast Fourier Transform (FFT) and Harmonic Product Spectrum (HPS), and returns the fundamental frequency in Hertz.
**Role:** Pure stateless analysis. This service does not know about notes, strings, or scores. It only operates on physical frequency.

## 2. Technical Stack

- **Language:** Python 3.10+
- **Framework:** FastAPI (async WebSockets)
- **Server:** Uvicorn (ASGI)
- **Math Libraries:** NumPy
- **Protocol:** WebSocket (`ws://`)

## 3. API Specifications

### 3.1 Endpoint: `/ws/analyze`

- **Method:** WebSocket

#### Input Data (Client → Server)

- **Format:** Binary blob (bytes)
- **Content:** Raw PCM audio data
- **Encoding:** 32-bit float (Web Audio standard) or 16-bit integer
- **Sample Rate:** 44.1 kHz (optionally downsampled to 22.05 kHz)

#### Output Data (Server → Client)

- **Format:** JSON
- **Content:**
  <!-- TODO: convert this block back to a proper fenced JSON code block -->

    {
      "frequency": 82.41,
      "confidence": 0.95,
      "timestamp": 167889231
    }

## 4. Functional Requirements

### 4.1 Audio Processing Pipeline

The backend must process incoming packets in a non-blocking loop:

- Ingest audio byte stream from the socket
- Normalize input to Int16 for HPS compatibility
- Apply Hanning window to reduce spectral leakage
- Run FFT and Harmonic Product Spectrum
  - Perform FFT
  - Downsample and multiply harmonics
  - Identify peak index
  - Apply parabolic interpolation for sub-bin accuracy
- Silence gate
  - If RMS volume is below threshold, return `frequency = 0` or `null`

### 4.2 Latency Constraints

- **Processing time:** Less than 20 ms per chunk
- **Concurrency:** Must support multiple simultaneous WebSocket connections using AsyncIO

## 5. Deployment & Environment

- **Local Development:** `localhost:8000` via Uvicorn
- **CORS:** Allow requests from frontend at `localhost:3000`
