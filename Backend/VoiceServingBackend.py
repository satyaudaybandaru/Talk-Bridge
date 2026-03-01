import asyncio
import base64
import functools
import wave
import time
import traceback
from io import BytesIO

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from sarvamai import AsyncSarvamAI, SarvamAI, AudioOutput

# ======================
# CONFIG
# ======================
API_KEY = "YOUR_SARVAMAI_API_KEY"

app = FastAPI()

async_client = AsyncSarvamAI(api_subscription_key=API_KEY)
sync_client = SarvamAI(api_subscription_key=API_KEY)


@app.websocket("/ws/translate")
async def websocket_translate(websocket: WebSocket):
    await websocket.accept()
    print("\n==============================")
    print(" Client connected")
    print("==============================\n")

    try:
        # ======================
        # RECEIVE CONFIG
        # ======================
        print(" Waiting for config...")
        config = await websocket.receive_json()
        print(" Config received:", config)

        if config.get("type") != "config":
            print(" Invalid config type")
            await websocket.close(code=1003)
            return

        SOURCE_LANG = config.get("source_lang")
        TARGET_LANG = config.get("target_lang")
        SAMPLE_RATE = config.get("sample_rate", 16000)

        if not SOURCE_LANG or not TARGET_LANG:
            print(" Missing language config")
            await websocket.close(code=1003)
            return

        print(f" Session started: {SOURCE_LANG} → {TARGET_LANG}")
        print(f" Sample Rate: {SAMPLE_RATE}")

        # ======================
        # CONNECT SARVAM STREAMS
        # ======================
        print(" Connecting to STT...")
        async with async_client.speech_to_text_streaming.connect(
            model="saaras:v3",
            mode="transcribe",
            language_code=SOURCE_LANG,
            sample_rate=SAMPLE_RATE,
            high_vad_sensitivity=True,
            vad_signals=False,
        ) as stt_ws:

            print(" STT connected")

            print("🔌 Connecting to TTS...")
            async with async_client.text_to_speech_streaming.connect(
                model="bulbul:v3",
                send_completion_event=True,
            ) as tts_ws:

                print(" TTS connected")

                await tts_ws.configure(
                    target_language_code=TARGET_LANG,
                    speaker="aditya",
                    output_audio_codec="wav",
                )

                print(" TTS configured")

                # ======================
                # AUDIO BUFFER SETTINGS
                # ======================
                buffer = bytearray()
                BUFFER_DURATION = 0.4
                BYTES_PER_SAMPLE = 2
                CHANNELS = 1

                BUFFER_SIZE = int(
                    SAMPLE_RATE * BUFFER_DURATION * BYTES_PER_SAMPLE
                )

                print(f" Buffer size (bytes): {BUFFER_SIZE}")

                # ======================
                # RECEIVE AUDIO
                # ======================
                async def receive_audio():
                    nonlocal buffer
                    print(" Audio receiver started")

                    while True:
                        chunk = await websocket.receive_bytes()
                        print(f" Received chunk: {len(chunk)} bytes")

                        buffer.extend(chunk)
                        print(f" Current buffer size: {len(buffer)}")

                        if len(buffer) >= BUFFER_SIZE:
                            print(" Buffer threshold reached. Preparing WAV...")

                            wav_buffer = BytesIO()
                            with wave.open(wav_buffer, "wb") as wf:
                                wf.setnchannels(CHANNELS)
                                wf.setsampwidth(BYTES_PER_SAMPLE)
                                wf.setframerate(SAMPLE_RATE)
                                wf.writeframes(buffer)

                            wav_bytes = wav_buffer.getvalue()
                            print(f" WAV size: {len(wav_bytes)} bytes")

                            audio_b64 = base64.b64encode(wav_bytes).decode("utf-8")
                            print(f" Base64 size: {len(audio_b64)} chars")

                            print(" Sending audio to STT...")
                            await stt_ws.transcribe(
                                audio=audio_b64,
                                encoding="audio/wav",
                                sample_rate=SAMPLE_RATE,
                            )

                            print(" Audio sent to STT")
                            buffer = bytearray()

                # ======================
                # STT → TRANSLATE → TTS
                # ======================
                async def stt_to_tts():
                    loop = asyncio.get_running_loop()
                    print(" STT listener started")

                    async for message in stt_ws:
                        print("\n STT message received")
                        print("Raw message:", message)
                        print("Message type:", type(message))

                        if hasattr(message, "type"):
                            print("Message.type:", message.type)

                        if hasattr(message, "data"):
                            print("Message.data:", message.data)

                        if hasattr(message, "type") and message.type == "data":
                            if hasattr(message.data, "transcript"):

                                source_text = message.data.transcript.strip()

                                if not source_text:
                                    print(" Empty transcript")
                                    continue

                                print(" Recognized:", source_text)

                                # Translation timing
                                t0 = time.time()

                                translation = await loop.run_in_executor(
                                    None,
                                    functools.partial(
                                        sync_client.text.translate,
                                        input=source_text,
                                        source_language_code=SOURCE_LANG,
                                        target_language_code=TARGET_LANG,
                                    )
                                )

                                t1 = time.time()
                                print(f" Translation time: {t1 - t0:.3f}s")

                                translated_text = getattr(
                                    translation,
                                    "translated_text",
                                    ""
                                )

                                print(" Translated:", translated_text)

                                print(" Sending text update to client...")
                                await websocket.send_json({
                                    "type": "text",
                                    "source_text": source_text,
                                    "translated_text": translated_text
                                })

                                print(" Sending to TTS convert()...")
                                await tts_ws.convert(translated_text)

                                print(" Flushing TTS...")
                                await tts_ws.flush()

                                print(" TTS convert + flush done")

                # ======================
                # STREAM TTS AUDIO BACK
                # ======================
                async def send_audio_back():
                    print(" TTS audio listener started")

                    async for message in tts_ws:
                        print("\n TTS message received")
                        print("Message type:", type(message))

                        if isinstance(message, AudioOutput):
                            print(" AudioOutput received")

                            audio_b64 = message.data.audio
                            print("Base64 length:", len(audio_b64))

                            audio_bytes = base64.b64decode(audio_b64)
                            print("Decoded audio size:", len(audio_bytes))

                            print(" Sending audio chunk to client...")
                            await websocket.send_bytes(audio_bytes)

                        else:
                            print(" Non-audio TTS message:", message)

                # ======================
                # RUN ALL TASKS
                # ======================
                await asyncio.gather(
                    receive_audio(),
                    stt_to_tts(),
                    send_audio_back()
                )

    except WebSocketDisconnect:
        print("\n Client disconnected")
    except Exception as e:
        print("\n ERROR OCCURRED:")
        print(str(e))
        traceback.print_exc()