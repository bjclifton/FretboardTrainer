"""
This module provides basic audio analysis functionality.
"""
import numpy as np

# pylint: disable=too-few-public-methods
class AudioAnalyzer:
    """
    Analyzes raw audio data to find the fundamental frequency using the HPS algorithm.
    """
    def __init__(self, rate=44100):
        """Initializes the analyzer with default audio processing parameters."""
        self.rate = rate
        self.chunk = 4096
        self.hps_cycles = 3
        self.silence_threshold = 500000

    def _preprocess_audio(self, audio_bytes: bytes) -> np.ndarray | None:
        """
        Decodes, checks for silence, converts, and windows the raw audio data.
        Returns windowed int16 data, or None if silent.
        """
        # Decode Float32 data from bytes
        data_float = np.frombuffer(audio_bytes, dtype=np.float32)

        # Silence gate using RMS
        rms = np.sqrt(np.mean(data_float**2))
        if rms < 0.01:
            return None

        # Convert to Int16 and apply Hanning window
        data_int = (data_float * 32767).astype(np.int16)
        window = np.hanning(len(data_int))
        return data_int * window

    def _calculate_hps(self, data_windowed: np.ndarray) -> list[float]:
        """
        Calculates the Harmonic Product Spectrum (HPS) from windowed data.
        """
        fft_raw = np.fft.rfft(data_windowed, n=self.chunk * 2)
        fft_magnitude = np.abs(fft_raw)

        # HPS algorithm
        hps_spec = list(fft_magnitude)
        for i in range(2, self.hps_cycles + 1):
            downsampled = fft_magnitude[::i]
            hps_spec = hps_spec[:len(downsampled)] * downsampled
        return hps_spec

    def _find_peak_frequency(self, hps_spec: list[float]) -> float:
        """
        Finds the peak in the HPS and calculates the fundamental frequency.
        """
        peak_index = np.argmax(hps_spec)

        # Return 0.0 if peak is below the silence threshold
        if hps_spec[peak_index] < self.silence_threshold:
            return 0.0

        # Parabolic interpolation to find a more accurate peak
        try:
            y_a = hps_spec[peak_index - 1]
            y_b = hps_spec[peak_index]
            y_c = hps_spec[peak_index + 1]
            adjustment = 0.5 * (y_a - y_c) / (y_a - 2 * y_b + y_c)
            true_peak_index = peak_index + adjustment
        except IndexError:
            true_peak_index = float(peak_index)

        return float(true_peak_index * self.rate / (self.chunk * 2))


    def process(self, audio_bytes: bytes) -> float:
        """
        Takes raw bytes from WebSocket, runs HPS, returns Frequency (Hz).
        Returns 0.0 if silence or error.
        """
        try:
            # 1. Preprocess the audio data
            data_windowed = self._preprocess_audio(audio_bytes)
            if data_windowed is None:
                return 0.0

            # 2. Calculate Harmonic Product Spectrum
            hps_spec = self._calculate_hps(data_windowed)

            # 3. Find the fundamental frequency from the HPS peak
            frequency = self._find_peak_frequency(hps_spec)

            return float(frequency)

        except (ValueError, IndexError):
            # Errors during numpy operations are caught here
            return 0.0
