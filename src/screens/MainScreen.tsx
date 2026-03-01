import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { translationService } from '../services/TranslationService';
import { audioService } from '../services/AudioService';

type Message = { id: string, text: string, type: 'source' | 'target', lang: string };

const SUPPORTED_LANGUAGES = [
    { label: 'English (India)', value: 'en-IN' },
    { label: 'Hindi', value: 'hi-IN' },
    { label: 'Bengali', value: 'bn-IN' },
    { label: 'Tamil', value: 'ta-IN' },
    { label: 'Telugu', value: 'te-IN' },
    { label: 'Gujarati', value: 'gu-IN' },
    { label: 'Kannada', value: 'kn-IN' },
    { label: 'Malayalam', value: 'ml-IN' },
    { label: 'Marathi', value: 'mr-IN' },
    { label: 'Punjabi', value: 'pa-IN' },
    { label: 'Odia', value: 'od-IN' },
];

export default function MainScreen({ navigation }: any) {
    const [isRecording, setIsRecording] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const scrollViewRef = useRef<ScrollView>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

    // Default to the first and second languages in the array
    const [sourceLangObj, setSourceLangObj] = useState(SUPPORTED_LANGUAGES[0]);
    const [targetLangObj, setTargetLangObj] = useState(SUPPORTED_LANGUAGES[1]);

    useEffect(() => {
        audioService.init();

        translationService.onMessageReceived = (source, target) => {
            setMessages(prev => [
                ...prev,
                { id: Date.now().toString() + 's', text: source, type: 'source', lang: sourceLangObj.label },
                { id: Date.now().toString() + 't', text: target, type: 'target', lang: targetLangObj.label }
            ]);
        };

        translationService.onAudioReceived = (buffer) => {
            audioService.playAudio(buffer);
        };

        // Pass the actual language codes (values) to the API config
        translationService.connect(sourceLangObj.value, targetLangObj.value, 16000);

        return () => {
            translationService.disconnect();
            audioService.stopRecording();
        };
    }, [sourceLangObj.value, targetLangObj.value]);

    const toggleRecording = () => {
        if (isRecording) {
            audioService.stopRecording();
            setIsRecording(false);
            audioService.onAudioRecord = null;
        } else {
            audioService.onAudioRecord = (buffer) => {
                translationService.sendAudioChunk(buffer);
            };
            audioService.startRecording();
            setIsRecording(true);
        }
    };

    const handleStop = () => {
        audioService.stopRecording();
        setIsRecording(false);
    };

    const handleSwapLanguages = () => {
        setSourceLangObj(targetLangObj);
        setTargetLangObj(sourceLangObj);
    };

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
                <TouchableOpacity className="size-12 items-center justify-center rounded-full">
                    <MaterialIcons name="arrow-back" size={24} color="#1b130e" />
                </TouchableOpacity>
                <Text className="text-text-main text-lg font-display font-bold">Talk Bridge</Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Account')}
                    className="size-12 items-center justify-center rounded-full hover:bg-black/5"
                >
                    <MaterialIcons name="settings" size={24} color="#1b130e" />
                </TouchableOpacity>
            </View>

            {/* Language Selectors */}
            <View className="px-4 py-4 flex-row items-center gap-2 bg-surface-light">
                <View className="flex-1 bg-surface-light border border-stone-200 rounded-xl shadow-sm overflow-hidden h-14 justify-center">
                    <Picker
                        selectedValue={sourceLangObj.value}
                        onValueChange={(itemValue) => {
                            const selected = SUPPORTED_LANGUAGES.find(l => l.value === itemValue);
                            if (selected) setSourceLangObj(selected);
                        }}
                        style={{ height: '100%', width: '100%', color: '#1b130e', backgroundColor: 'transparent' }}
                        dropdownIconColor="#956a50"
                    >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                            <Picker.Item key={lang.value} label={lang.label} value={lang.value} style={{ fontFamily: 'Plus Jakarta Sans' }} />
                        ))}
                    </Picker>
                </View>

                <TouchableOpacity
                    className="p-3 rounded-full bg-surface-light shadow-sm active:scale-95"
                    onPress={handleSwapLanguages}
                >
                    <MaterialIcons name="swap-horiz" size={24} color="#4B9DA9" />
                </TouchableOpacity>

                <View className="flex-1 bg-surface-light border border-stone-200 rounded-xl shadow-sm overflow-hidden h-14 justify-center">
                    <Picker
                        selectedValue={targetLangObj.value}
                        onValueChange={(itemValue) => {
                            const selected = SUPPORTED_LANGUAGES.find(l => l.value === itemValue);
                            if (selected) setTargetLangObj(selected);
                        }}
                        style={{ height: '100%', width: '100%', color: '#1b130e', backgroundColor: 'transparent' }}
                        dropdownIconColor="#956a50"
                    >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                            <Picker.Item key={lang.value} label={lang.label} value={lang.value} style={{ fontFamily: 'Plus Jakarta Sans' }} />
                        ))}
                    </Picker>
                </View>
            </View>

            {/* Playback Speed Control */}
            <View className="px-4 pb-2 flex-row justify-end items-center gap-2">
                <Text className="text-sm font-display text-text-muted">Audio Speed:</Text>
                <View className="bg-surface-light border border-stone-200 rounded-lg shadow-sm w-32 h-10 justify-center">
                    <Picker
                        selectedValue={playbackSpeed}
                        onValueChange={(itemValue) => {
                            setPlaybackSpeed(itemValue);
                            audioService.setPlaybackRate(itemValue);
                        }}
                        style={{ height: '100%', width: '100%', color: '#1b130e', backgroundColor: 'transparent' }}
                        dropdownIconColor="#956a50"
                    >
                        <Picker.Item label="0.5x (Slow)" value={0.5} style={{ fontSize: 13, fontFamily: 'Plus Jakarta Sans' }} />
                        <Picker.Item label="0.75x" value={0.75} style={{ fontSize: 13, fontFamily: 'Plus Jakarta Sans' }} />
                        <Picker.Item label="1.0x (Normal)" value={1.0} style={{ fontSize: 13, fontFamily: 'Plus Jakarta Sans' }} />
                        <Picker.Item label="1.25x" value={1.25} style={{ fontSize: 13, fontFamily: 'Plus Jakarta Sans' }} />
                        <Picker.Item label="1.5x (Fast)" value={1.5} style={{ fontSize: 13, fontFamily: 'Plus Jakarta Sans' }} />
                        <Picker.Item label="2.0x" value={2.0} style={{ fontSize: 13, fontFamily: 'Plus Jakarta Sans' }} />
                    </Picker>
                </View>
            </View>

            {/* Chat Area */}
            <ScrollView
                ref={scrollViewRef}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                className="flex-1 px-4"
                contentContainerStyle={{ paddingVertical: 16 }}
            >
                {messages.map((msg) => (
                    msg.type === 'source' ? (
                        <View key={msg.id} className="flex-row items-end gap-3 mb-6">
                            <View className="w-10 h-10 rounded-full bg-stone-300"></View>
                            <View className="flex-1 items-start">
                                <Text className="text-xs text-text-muted mb-1 ml-1 font-display font-medium">Source ({msg.lang})</Text>
                                <View className="bg-bubble-source px-4 py-3 rounded-2xl rounded-bl-none shadow-sm pb-6">
                                    <Text className="text-[#5c5446] font-display font-medium text-[15px]">{msg.text}</Text>
                                    <TouchableOpacity className="absolute bottom-1 right-2">
                                        <MaterialIcons name="volume-up" size={18} color="#956a50" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View key={msg.id} className="flex-row items-end gap-3 justify-end mb-6">
                            <View className="flex-1 items-end">
                                <Text className="text-xs text-text-muted mb-1 mr-1 font-display font-medium">Target ({msg.lang})</Text>
                                <View className="bg-bubble-target px-4 py-3 rounded-2xl rounded-br-none shadow-sm pb-6">
                                    <Text className="text-[#1e453e] font-display font-medium text-[15px]">{msg.text}</Text>
                                    <TouchableOpacity className="absolute bottom-1 left-2">
                                        <MaterialIcons name="volume-up" size={18} color="#956a50" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View className="w-10 h-10 rounded-full bg-primary/20"></View>
                        </View>
                    )
                ))}

                {isRecording && (
                    <View className="items-center mt-2">
                        <Text className="text-text-muted text-sm font-display italic animate-pulse">Recording translation...</Text>
                    </View>
                )}
            </ScrollView>

            {/* Bottom Controls */}
            <View className="p-4 pb-8 bg-surface-light border-t border-stone-200">
                <View className="flex-row items-center gap-4 justify-center max-w-md w-full mx-auto">
                    <TouchableOpacity className="w-14 h-14 rounded-full border-2 border-stone-200 items-center justify-center bg-surface-light">
                        <MaterialIcons name="keyboard" size={24} color="#956a50" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={toggleRecording}
                        className={`flex-1 h-16 rounded-full flex-row items-center justify-center shadow-md transition-colors duration-300 ${isRecording ? 'bg-red-500 shadow-red-500/30' : 'bg-primary shadow-primary/30'}`}>
                        <MaterialIcons name={isRecording ? "mic-off" : "mic"} size={28} color="white" />
                        <Text className="text-white font-display font-bold text-lg ml-2">{isRecording ? "Listening..." : "Tap to Speak"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleStop} className="w-14 h-14 rounded-full border-2 border-stone-200 items-center justify-center bg-surface-light">
                        <MaterialIcons name="stop" size={24} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
