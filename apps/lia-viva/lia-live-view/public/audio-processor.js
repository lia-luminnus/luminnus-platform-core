/**
 * PCM Audio Worklet Processor
 * Replaces deprecated ScriptProcessorNode
 * Runs in separate thread for better performance
 */

class PCMWorkletProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        this.port.onmessage = (event) => {
            if (event.data === "stop") {
                this.stopped = true;
            }
        };

        this.stopped = false;
    }

    process(inputs, outputs, parameters) {
        // Stop processing if requested
        if (this.stopped) {
            return false;
        }

        const input = inputs[0];

        if (input && input[0]) {
            const channelData = input[0];

            // Convert Float32Array to Int16Array (PCM 16-bit)
            const pcm = new Int16Array(channelData.length);

            for (let i = 0; i < channelData.length; i++) {
                // Clamp to [-1, 1] and scale to 16-bit integer
                const sample = Math.max(-1, Math.min(1, channelData[i]));
                pcm[i] = sample * 32767;
            }

            // Send PCM data to main thread
            this.port.postMessage(pcm);
        }

        // Continue processing
        return true;
    }
}

registerProcessor("pcm-worklet", PCMWorkletProcessor);
