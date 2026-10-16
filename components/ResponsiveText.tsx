import { StyleSheet, Text as NativeText, TextInput as NativeTextInput, useWindowDimensions } from 'react-native';
import type { TextInputProps, TextProps } from 'react-native';

const FONT_SIZES: Record<string, number> = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
  '8xl': 96,
  '9xl': 128,
};

export function responsiveFontSize(size: number, width: number) {
  const scale = Math.min(1.15, Math.max(1.08, width / 375));
  return size * scale;
}

function getResponsiveFontSize(className: string | undefined, style: TextProps['style'], width: number) {
  const explicitSize = StyleSheet.flatten(style)?.fontSize;
  const sizeClass = className?.match(/(?:^|\s)text-(9xl|8xl|7xl|6xl|5xl|4xl|3xl|2xl|xl|lg|base|sm|xs)(?:\s|$)/)?.[1];
  const arbitrarySize = className?.match(/(?:^|\s)text-\[(\d+(?:\.\d+)?)(?:px)?\](?:\s|$)/)?.[1];
  const baseSize = explicitSize ?? (sizeClass ? FONT_SIZES[sizeClass] : undefined) ?? (arbitrarySize ? Number(arbitrarySize) : 14);

  return responsiveFontSize(baseSize, width);
}

export function ResponsiveText({ className, style, ...props }: TextProps & { className?: string }) {
  const { width } = useWindowDimensions();

  return (
    <NativeText
      {...props}
      className={className}
      style={[style, { fontSize: getResponsiveFontSize(className, style, width) }]}
    />
  );
}

export function ResponsiveTextInput({
  className,
  style,
  ...props
}: TextInputProps & { className?: string }) {
  const { width } = useWindowDimensions();

  return (
    <NativeTextInput
      {...props}
      className={className}
      style={[style, { fontSize: getResponsiveFontSize(className, style, width) }]}
    />
  );
}
