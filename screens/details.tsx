import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { TIERS } from '../constants/tiers';
import { RouteProp } from '@react-navigation/native';

const DetailsScreen = ({ route }: { route: RouteProp<any, any> }) => {
  const { capability, details } = route.params || {};

  const getTierInfo = (tier: string) => {
    return TIERS[tier as unknown as keyof typeof TIERS] || { name: 'Unknown', description: '', sentence: '' };
  };

  const renderPerformanceDetails = () => (
    <View>
      <Text style={styles.detailSectionTitle}>What this means:</Text>
      <Text style={styles.detailText}>
        Your phone's performance tier determines how smoothly it runs apps, 
        how many apps you can have open at once, and how quickly it responds 
        to your touches.
      </Text>
      
      <Text style={styles.detailSectionTitle}>Comparison:</Text>
      {Object.entries(TIERS).map(([key, tier]) => (
        <View key={key} style={styles.tierComparison}>
          <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
          <Text style={styles.tierName}>{tier.name}:</Text>
          <Text style={styles.tierDesc}>{tier.description}</Text>
        </View>
      ))}
    </View>
  );

  const renderGamingDetails = () => (
    <View>
      <Text style={styles.detailSectionTitle}>Gaming Performance:</Text>
      <Text style={styles.detailText}>
        Based on your phone's hardware, here's what you can expect for gaming:
      </Text>
      
      <View style={styles.gamingExpectations}>
        <Text style={styles.expectation}>• Casual games: Smooth experience</Text>
        <Text style={styles.expectation}>• Popular games: Playable with adjustments</Text>
        <Text style={styles.expectation}>• AAA games: May require lower settings</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{capability}</Text>
        {details?.tier && (
          <View style={[styles.tierBadge, { backgroundColor: getTierInfo(details.tier).color + '20' }]}>
            <Text style={[styles.tierText, { color: getTierInfo(details.tier).color }]}>
              {getTierInfo(details.tier).name}
            </Text>
          </View>
        )}
      </View>

      {capability === 'Performance' && renderPerformanceDetails()}
      {capability === 'Gaming' && renderGamingDetails()}
      
      <View style={styles.note}>
        <Text style={styles.noteText}>
          Note: All analysis is done locally on your device. 
          No data is sent to servers.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 24,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tierText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 24,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginHorizontal: 16,
  },
  tierComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 6,
  },
  tierDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  tierName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    width: 100,
  },
  tierDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  gamingExpectations: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  expectation: {
    fontSize: 15,
    color: colors.textSecondary,
    marginVertical: 4,
    lineHeight: 22,
  },
  note: {
    margin: 20,
    padding: 16,
    backgroundColor: colors.lightGray,
    borderRadius: 12,
  },
  noteText: {
    fontSize: 14,
    color: colors.darkGray,
    textAlign: 'center',
  },
});

export default DetailsScreen;