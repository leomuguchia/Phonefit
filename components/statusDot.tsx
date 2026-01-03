import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

interface StatusDotProps {
  color: string;
  size?: number;
}

const StatusDot: React.FC<StatusDotProps> = ({ color, size = 8 }) => {
  return (
    <View style={[styles.dot, { backgroundColor: color, width: size, height: size, borderRadius: size / 2 }]} />
  );
};

const styles = StyleSheet.create({
  dot: {
    marginHorizontal: 2,
  },
});

export default StatusDot;