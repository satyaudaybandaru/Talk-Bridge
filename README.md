#  Talk Bridge

Real-time voice translation app built for travelers in India.\
Speak in your language and instantly understand others in your own.

------------------------------------------------------------------------

##  Configuration

Before running the project, update the following:

###  Backend

In `VoiceServingBackend.py`\
→ Add your **Sarvam API Key**

###  Frontend

In `translationService.ts`\
→ Update **Backend IP Address + Port**\
(Default port is usually `8000`)

------------------------------------------------------------------------

##  Running the Backend

Make your current directory the `backend` folder:

``` bash
uv sync
uv run fastapi run VoiceServingBackend.py
```

Backend will run on:

    http://YOUR_IP:8000

------------------------------------------------------------------------

##  Running the Expo Application

Make your current working directory the root folder (`Talk-Bridge`).

>  **Note:** You need a custom development build to use microphone and
> audio features.

### 1️⃣ Install Dependencies

``` bash
npm i
```

### 2️⃣ Login to Expo (Create account if needed)

``` bash
npx eas-cli login
```

### 3️⃣ Build Development APK

``` bash
npx eas-cli build -p android --profile development
```

### 4️⃣ Install the Built APK

Install the generated build on your Android device.

### 5️⃣ Start Expo Server

``` bash
npx expo start -c
```

Scan the QR code → The app should now be running 🎉

🎧 **Use earbuds/headphones for better experience**

------------------------------------------------------------------------

##  Demo Images

<p align="center">
  <img width="200" height="1530" alt="image" src="https://github.com/user-attachments/assets/4a53a68c-3113-4970-a7a5-c9c2a0a9144e" style="margin-right: 40;"/>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img width="200" height="1530" alt="image" src="https://github.com/user-attachments/assets/3200c4e5-87de-4bd6-8fba-e5bc385b71c0" />
</p>

------------------------------------------------------------------------

## 🔮 Further Developments

-   Make the application **Full Duplex** (simultaneous two-way
    conversation)
-   Improve UI/UX for better user experience

------------------------------------------------------------------------

🗣️ Speak. 🌐 Translate. 🤝 Connect.
