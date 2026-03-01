export class TranslationService {
    private ws: WebSocket | null = null;
    public onMessageReceived: ((sourceText: string, translatedText: string) => void) | null = null;
    public onAudioReceived: ((audioData: ArrayBuffer) => void) | null = null;

    connect(sourceLang: string, targetLang: string, sampleRate: number = 16000) {
        // Here you would inject your API_KEY (usually from process.env or a secure store)

        this.ws = new WebSocket(`ws://BACKEND_IP:PORT/ws/translate`); // Replace BACKEND_IP and PORT with your backend IP and port
        this.ws.binaryType = "arraybuffer";

        this.ws.onopen = () => {
            console.log("Connected to Translation Server");
            this.ws?.send(JSON.stringify({
                type: "config",
                source_lang: sourceLang,
                target_lang: targetLang,
                sample_rate: sampleRate
            }));
        };

        this.ws.onmessage = (event) => {
            if (typeof event.data === "string") {
                try {
                    const data = JSON.parse(event.data);
                    if (this.onMessageReceived) {
                        this.onMessageReceived(data.source_text, data.translated_text);
                    }
                } catch (e) {
                    console.error("Invalid WS JSON", e);
                }
            } else {
                if (this.onAudioReceived) {
                    this.onAudioReceived(event.data);
                }
            }
        };

        this.ws.onclose = () => {
            console.log("Disconnected from Translation Server");
        };
    }

    sendAudioChunk(pcmData: ArrayBuffer) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(pcmData);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

export const translationService = new TranslationService();
