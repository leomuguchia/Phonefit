import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../constants/colors';

interface UsageRingProps {
  value: number;
  maxValue: number;
  label: string;
  color: string;
  size?: number;
  strokeWidth?: number;
}

const UsageRing: React.FC<UsageRingProps> = ({
  value,
  maxValue,
  label,
  color,
  size = 80,
  strokeWidth = 8,
}) => {
  // Validate inputs
  const validValue = typeof value === 'number' && !isNaN(value) && value >= 0 ? value : 0;
  const validMaxValue = typeof maxValue === 'number' && maxValue > 0 ? maxValue : 100;
  const progress = Math.min(validValue / validMaxValue, 1);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // Don't render if size is invalid
  if (size <= 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>?</Text>
        <Text style={styles.label}>Error</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          stroke={colors.lightGray}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.labelContainer}>
        <Text style={styles.value}>{Math.round(progress * 100)}%</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  labelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lightGray + '30',
    borderRadius: 40,
  },
  errorText: {
    fontSize: 20,
    color: colors.gray,
    fontWeight: 'bold',
  },
});

export default UsageRing;