// components/ConfidenceBar.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

interface ConfidenceBarProps {
  confidence: number; // 0-100
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const ConfidenceBar: React.FC<ConfidenceBarProps> = ({ 
  confidence, 
  size = 'medium', 
  showLabel = true 
}) => {
  const validConfidence = Math.max(0, Math.min(100, confidence));
  const barWidth = validConfidence / 100;
  
  const getColor = () => {
    if (validConfidence >= 80) return colors.success;
    if (validConfidence >= 60) return colors.warning;
    return colors.error;
  };

  const getHeight = () => {
    switch (size) {
      case 'small': return 4;
      case 'medium': return 6;
      case 'large': return 8;
      default: return 6;
    }
  };

  return (
    <View style={styles.container}>
      {showLabel && (
        <Text style={styles.label}>{validConfidence}% confidence</Text>
      )}
      <View style={[styles.track, { height: getHeight() }]}>
        <View 
          style={[
            styles.bar, 
            { 
              flex: barWidth, 
              backgroundColor: getColor(),
              height: getHeight() 
            }
          ]} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  track: {
    width: '100%',
    backgroundColor: colors.lightGray,
    borderRadius: 10,
    overflow: 'hidden',
  },
  bar: {
    borderRadius: 10,
  },
});

export default ConfidenceBar;