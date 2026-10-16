// components/recipe/CookModeSheet.tsx
import { useEffect, useState } from 'react';
import { View, Pressable, Modal, Alert } from 'react-native';
import { X } from 'lucide-react-native';
import * as KeepAwake from 'expo-keep-awake';
import type { CookStep } from '../../types';
import { StepTimer } from './StepTimer';
import { ResponsiveText as Text } from '../ResponsiveText';

interface Props {
  steps: CookStep[];
  onClose: () => void;
  onComplete: () => Promise<void>;
}

export function CookModeSheet({ steps, onClose, onComplete }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isSavingCompletion, setIsSavingCompletion] = useState(false);
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const finishCooking = async () => {
    if (isSavingCompletion) return;
    setIsSavingCompletion(true);
    try {
      await onComplete();
      onClose();
    } catch (error) {
      Alert.alert(
        "Couldn't save cooking progress",
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setIsSavingCompletion(false);
    }
  };

  // Keep-screen-awake is scoped entirely to Cook Mode's lifecycle.
  useEffect(() => {
    KeepAwake.activateKeepAwakeAsync('cook-mode');
    return () => {
      KeepAwake.deactivateKeepAwake('cook-mode');
    };
  }, []);

  return (
    <Modal animationType="slide" presentationStyle="fullScreen">
      <View className="flex-1 bg-[#3A2A1A] px-6 pt-16 pb-8 justify-between">
        <View>
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white/60 text-sm">
              Step {stepIndex + 1} of {steps.length}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close cooking mode"
              hitSlop={8}
            >
              <X size={24} color="white" />
            </Pressable>
          </View>

          <Text className="text-white text-2xl font-bold mb-3">{currentStep.title}</Text>
          <Text className="text-white/90 text-base leading-6">{currentStep.instruction}</Text>

          {currentStep.timerSeconds ? (
            <StepTimer key={currentStep.id} seconds={currentStep.timerSeconds} />
          ) : null}
        </View>

        <View className="flex-row gap-3">
          {stepIndex > 0 && (
            <Pressable
              onPress={() => setStepIndex((i) => i - 1)}
              className="flex-1 bg-white/10 rounded-2xl py-4 items-center"
            >
              <Text className="text-white font-medium">Back</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => (isLastStep ? void finishCooking() : setStepIndex((i) => i + 1))}
            disabled={isSavingCompletion}
            className="flex-1 bg-[#D97706] rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-semibold">
              {isSavingCompletion ? 'Saving...' : isLastStep ? 'Done!' : 'Next'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
