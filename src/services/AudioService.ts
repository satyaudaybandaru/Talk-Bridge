import { Platform } from 'react-native';

const RECORD_SAMPLE_RATE = 16000;
const PLAYBACK_SAMPLE_RATE = 24000;

export class AudioService {
    public onAudioRecord: ((pcmBuffer: ArrayBuffer) => void) | null = null;
    private isRecording = false;

    // React Native Audio
    private LiveAudioStream: any = null;

    // Web Audio vars
    private stream: any = null;
    private audioContext: any = null;
    private processor: any = null;
    private input: any = null;

    // Web Audio Streaming Playback
    private playbackCtx: any = null;
    private playbackTime: number = 0;

    // Native sound cache
    private sound: any = null;
    private playQueue: ArrayBuffer[] = [];
    private isPlayingChunk = false;
    private playTimeout: ReturnType<typeof setTimeout> | null = null;
    private playbackRate: number = 1.0;

    public setPlaybackRate(rate: number) {
        this.playbackRate = rate;
    }

    init() {
        console.log(`Audio Service matching 16kHz RECORD, 24kHz PLAYBACK limits.`);
        if (Platform.OS !== 'web') {
            try {
                this.LiveAudioStream = require('react-native-live-audio-stream').default;
                const options = {
                    sampleRate: RECORD_SAMPLE_RATE,
                    channels: 1,
                    bitsPerSample: 16,
                    audioSource: 6,
                    bufferSize: 4096
                };
                this.LiveAudioStream.init(options);
                this.LiveAudioStream.on('data', (data: string) => {
                    if (this.isRecording && this.onAudioRecord) {
                        try {
                            // React Native doesn't have Node's Buffer. We use a base64 string to ArrayBuffer converter.
                            const binaryString = atob(data);
                            const len = binaryString.length;
                            const bytes = new Uint8Array(len);
                            for (let i = 0; i < len; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            this.onAudioRecord(bytes.buffer);
                        } catch (e) {
                            console.error("PCM decoding error", e);
                        }
                    }
                });
            } catch (err) {
                console.error("Native Audio init error:", err);
            }
        }
    }

    async startRecording() {
        this.isRecording = true;
        console.log("Started recording microphone...");

        if (Platform.OS === 'web') {
            try {
                this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                    sampleRate: RECORD_SAMPLE_RATE
                });
                this.input = this.audioContext.createMediaStreamSource(this.stream);
                this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

                this.processor.onaudioprocess = (event: any) => {
                    if (!this.isRecording) return;
                    const floatData = event.inputBuffer.getChannelData(0);
                    const pcmData = this.floatTo16BitPCM(floatData);
                    if (this.onAudioRecord) {
                        this.onAudioRecord(pcmData);
                    }
                };

                this.input.connect(this.processor);
                this.processor.connect(this.audioContext.destination);
            } catch (err) {
                console.error("Web Mic Error:", err);
            }
        } else {
            if (this.LiveAudioStream) {
                this.LiveAudioStream.start();
            } else {
                console.warn("Live Audio Stream not initialized!");
            }
        }
    }

    stopRecording() {
        this.isRecording = false;
        if (Platform.OS === 'web') {
            if (this.processor) this.processor.disconnect();
            if (this.input) this.input.disconnect();
            if (this.audioContext) this.audioContext.close();
            if (this.stream) this.stream.getTracks().forEach((track: any) => track.stop());
        } else {
            if (this.LiveAudioStream) {
                this.LiveAudioStream.stop();
            }
        }
        console.log("Stopped recording.");
    }

    async playAudio(arrayBuffer: ArrayBuffer) {
        console.log(`[AudioService] Playing audio chunk...`);

        if (Platform.OS === 'web') {
            // Web Audio API buffer streaming
            if (!this.playbackCtx) {
                this.playbackCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
                    sampleRate: PLAYBACK_SAMPLE_RATE
                });
            }

            // Depending on the backend "wav" format, it might include a header or just be raw PCM.
            // If the audio sounds like static, we may need to skip a 44-byte WAV header here.

            // Assume the user's original raw PCM16 JS code is the required decoding path:
            const pcm = new Int16Array(arrayBuffer);
            const float32 = new Float32Array(pcm.length);

            for (let i = 0; i < pcm.length; i++) {
                float32[i] = pcm[i] / 32768;
            }

            const audioBuffer = this.playbackCtx.createBuffer(1, float32.length, PLAYBACK_SAMPLE_RATE);
            audioBuffer.copyToChannel(float32, 0);

            const source = this.playbackCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.playbackRate.value = this.playbackRate;
            source.connect(this.playbackCtx.destination);

            if (this.playbackTime < this.playbackCtx.currentTime) {
                this.playbackTime = this.playbackCtx.currentTime;
            }

            source.start(this.playbackTime);
            this.playbackTime += audioBuffer.duration;

        } else {
            this.playQueue.push(arrayBuffer);
            if (!this.isPlayingChunk && !this.playTimeout) {
                // Pre-buffer: wait 500ms before starting playback.
                // This allows multiple incoming WebSocket chunks to accumulate in the queue 
                // so they can be securely grouped into ONE large WAV file, 
                // eliminating ExoPlayer pause/play transition gaps.
                this.playTimeout = setTimeout(() => {
                    this.playTimeout = null;
                    this.processPlayQueue();
                }, 500);
            }
        }
    }

    private async processPlayQueue() {
        if (this.playQueue.length === 0) {
            this.isPlayingChunk = false;
            return;
        }

        this.isPlayingChunk = true;

        // Adaptive batching: Merge all currently queued chunks into one larger chunk
        // This drastically reduces the overhead of creating a new ExoPlayer for tiny 0.1s slices
        let totalLength = 0;
        for (const buf of this.playQueue) {
            totalLength += buf.byteLength;
        }

        const mergedBuffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const buf of this.playQueue) {
            mergedBuffer.set(new Uint8Array(buf), offset);
            offset += buf.byteLength;
        }
        this.playQueue = []; // clear the queue

        const arrayBuffer = mergedBuffer.buffer;

        try {
            // React Native Expo playback
            const { Audio } = require('expo-av');
            const wavBuffer = this.addWavHeader(arrayBuffer, PLAYBACK_SAMPLE_RATE);
            const base64 = this.arrayBufferToBase64(wavBuffer);
            const uri = `data:audio/wav;base64,${base64}`;

            const { sound } = await Audio.Sound.createAsync({ uri });
            this.sound = sound;
            await sound.setRateAsync(this.playbackRate, true);

            sound.setOnPlaybackStatusUpdate(async (status: any) => {
                if (status.didJustFinish) {
                    await sound.unloadAsync();
                    this.processPlayQueue();
                }
            });

            await sound.playAsync();
        } catch (err) {
            console.error("Native audio play error:", err);
            this.processPlayQueue();
        }
    }

    private addWavHeader(pcmBuffer: ArrayBuffer, sampleRate: number): ArrayBuffer {
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
        const blockAlign = (numChannels * bitsPerSample) / 8;
        const dataSize = pcmBuffer.byteLength;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        // RIFF chunk descriptor
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        this.writeString(view, 8, 'WAVE');

        // fmt sub-chunk
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);

        // data sub-chunk
        this.writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true);

        // Write PCM data
        new Uint8Array(buffer, 44).set(new Uint8Array(pcmBuffer));
        return buffer;
    }

    private writeString(view: DataView, offset: number, string: string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
        const buffer = new ArrayBuffer(float32Array.length * 2);
        const view = new DataView(buffer);
        let offset = 0;
        for (let i = 0; i < float32Array.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, float32Array[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return buffer;
    }
}

export const audioService = new AudioService();
