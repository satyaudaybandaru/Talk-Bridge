import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

export default function AccountScreen({ navigation }: any) {
    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="size-12 items-center justify-center rounded-full hover:bg-black/5"
                >
                    <MaterialIcons name="arrow-back" size={24} color="#1b130e" />
                </TouchableOpacity>
                <Text className="text-text-main text-lg font-display font-bold">Account</Text>
                <View className="size-12" />
            </View>

            <View className="flex-1 items-center justify-center p-6">
                <MaterialIcons name="person" size={80} color="#e37535" />
                <Text className="text-2xl text-text-main font-display font-bold mt-4">Profile Placeholder</Text>
                <Text className="text-text-muted text-center font-display mt-2 mb-8">
                    Space for future development, like account creation, authentication, and user preferences.
                </Text>

                <TouchableOpacity
                    className="w-full h-14 bg-surface-light border-2 border-primary rounded-xl items-center justify-center"
                    onPress={() => navigation.goBack()}
                >
                    <Text className="text-primary font-display font-bold text-lg">Return to Translation</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
