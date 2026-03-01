import React, { useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

export default function SplashScreen({ navigation }: any) {
    const fadeAnim = new Animated.Value(0);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
        }).start(() => {
            setTimeout(() => {
                navigation.replace('Main');
            }, 1000);
        });
    }, []);

    return (
        <View className="flex-1 bg-primary items-center justify-center">
            <Animated.View style={{ opacity: fadeAnim }} className="items-center">
                <Text className="text-white text-4xl font-display font-bold tracking-tight">
                    Talk Bridge
                </Text>
                <Text className="text-white/80 text-lg font-display mt-2 font-medium">
                    Your Real-Time Translator
                </Text>
            </Animated.View>
        </View>
    );
}
