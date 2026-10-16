// components/recipe/StepTimer.tsx
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, Pressable } from 'react-native';
import { ChefHat } from 'lucide-react-native';
import { ResponsiveText as Text } from '../ResponsiveText';

export function StepTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const cookingAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => Math.max(r - 1, 0));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, remaining]);

  useEffect(() => {
    const progress = 1 - remaining / seconds;
    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [progressAnimation, remaining, seconds]);

  const isComplete = remaining === 0;

  useEffect(() => {
    if (!running || isComplete) {
      cookingAnimation.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(cookingAnimation, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cookingAnimation, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [cookingAnimation, isComplete, running]);

  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progressWidth = progressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const cookingRotation = cookingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['-8deg', '8deg'],
  });

  return (
    <View className="mt-6 bg-white/10 rounded-2xl p-5 items-center">
      <View className="w-full h-2 bg-white/20 rounded-full overflow-hidden mb-4">
        <Animated.View className="h-2 bg-[#D97706] rounded-full" style={{ width: progressWidth }} />
      </View>
      <Animated.View
        className="mb-2"
        style={{
          transform: [
            { rotate: cookingRotation },
            { translateY: cookingAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
          ],
        }}
      >
        <ChefHat size={30} color="#FBBF24" />
      </Animated.View>
      <Text className="text-white text-3xl font-bold tabular-nums">
        {minutes}:{secs.toString().padStart(2, '0')}
      </Text>
      <Text className="text-white/70 text-sm mt-1">
        {isComplete ? "Time's up — check your food!" : running ? 'Your food is cooking…' : 'Ready when you are'}
      </Text>
      <Pressable
        onPress={() => setRunning((r) => (isComplete ? false : !r))}
        disabled={isComplete}
        className="mt-4 bg-white/15 px-6 py-2 rounded-full"
      >
        <Text className="text-white font-medium">
          {isComplete ? 'Done' : running ? 'Pause' : remaining < seconds ? 'Resume' : 'Start'}
        </Text>
      </Pressable>
    </View>
  );
}
