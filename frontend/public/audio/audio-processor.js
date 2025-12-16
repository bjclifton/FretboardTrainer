class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const channelData = inputs[0][0];

    if (channelData) {
      // Calculate volume for UI feedback (Root Mean Square)
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sum / channelData.length);

      // Post a clone of the data, as it will be reused by the browser.
      // Also post the calculated volume
      this.port.postMessage({
        type: 'audio',
        data: channelData.slice(0)
      });
      this.port.postMessage({
        type: 'volume',
        data: rms
      });
    }

    // Keep the processor alive.
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
