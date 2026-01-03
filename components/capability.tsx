// components/CapabilityCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../constants/colors';
import { TIERS } from '../constants/tiers';
const IconsComponent = Ionicons as any;

interface CapabilityCardProps {
  title: string;
  icon: string;
  tier?: number;
  description: string;
  confidence?: number | {  
    score: number;
    confidence: number;
    bars: number;
    color: string;
  };
  onPress?: () => void;
  color?: string;
}

const CapabilityCard: React.FC<CapabilityCardProps> = ({
  title,
  icon,
  tier,
  description,
  confidence,
  onPress,
  color = colors.primary,
}) => {
  const getTierColor = () => {
    if (!tier) return color;
    return TIERS[tier as keyof typeof TIERS]?.color || color;
  };

  const getConfidenceValue = () => {
    if (confidence === undefined) return 0;
    if (typeof confidence === 'number') return confidence;
    return confidence.confidence;
  };

  const getConfidenceBars = () => {
    const confValue = getConfidenceValue();
    const dotCount = 5;
    const filledCount = Math.ceil((confValue / 100) * dotCount);
    
    const dots = [];
    for (let i = 0; i < dotCount; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.confidenceDot,
            {
              backgroundColor: i < filledCount ? getTierColor() : colors.lightGray,
            },
          ]}
        />
      );
    }
    return dots;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: getTierColor() + '20' }]}>
          <IconsComponent name={icon} size={24} color={getTierColor()} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {tier && (
            <View style={styles.tierBadge}>
              <Text style={[styles.tierText, { color: getTierColor() }]}>
                {TIERS[tier as keyof typeof TIERS]?.name || `Tier ${tier}`}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      <Text style={styles.description}>{description}</Text>
      
      {(confidence !== undefined) && (
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>Confidence:</Text>
          <View style={styles.confidenceDots}>{getConfidenceBars()}</View>
          <Text style={styles.confidenceValue}>{getConfidenceValue()}%</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  tierBadge: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confidenceLabel: {
    fontSize: 12,
    color: colors.gray,
  },
  confidenceDots: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
    marginHorizontal: 12,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  confidenceValue: {
    fontSize: 12,
    color: colors.gray,
    fontWeight: '500',
  },
});

export default CapabilityCard;