import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useDevice } from '../utils/deviceInfo';
import CapabilityCard from '../components/capability';
import UsageRing from '../components/usageRing';
import ConfidenceBar from '../components/ConfidenceBar';
import { colors } from '../constants/colors';
import { TIERS } from '../constants/tiers';
import { 
  buildCapabilities, 
  generateConfidenceBars, 
  getCapabilityExplanation,
  getCapabilityTier,
  getCapabilityScore
} from '../capabilities/capabilityEngine';

const PerformanceScreen = () => {
  const { deviceInfo, runtimeSignals, loading } = useDevice();

  if (loading || !deviceInfo || !runtimeSignals) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading device capabilities...</Text>
      </View>
    );
  }

  // Build all capabilities using the new engine
  const capabilities = buildCapabilities(deviceInfo, runtimeSignals);
  const confidenceBars = generateConfidenceBars(capabilities);

  const performance = capabilities.performance;
  const gaming = capabilities.gaming;
  const batteryStress = capabilities.batteryStress;
  const videoRecording = capabilities.videoRecording;
  const dailyUsage = capabilities.dailyUsage;
  const featureUnlocks = capabilities.featureUnlocks;

  // Get tier info safely
  const performanceTier = performance.tier;
  const tierInfo = TIERS[performanceTier as keyof typeof TIERS] || TIERS[1];
  const tierColor = tierInfo.color || colors.primary;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Performance Overview</Text>
        <Text style={styles.subtitle}>How your phone handles tasks</Text>
      </View>

      {/* Overall Performance Tier Section */}
      <View style={styles.tierSection}>
        <View style={styles.tierCard}>
          <Text style={styles.tierLabel}>Overall Performance Tier</Text>
          <Text style={[styles.tierValue, { color: tierColor }]}>
            {tierInfo.name}
          </Text>
          <Text style={styles.tierDescription}>
            {tierInfo.description}
          </Text>
        </View>

        <View style={styles.ringsContainer}>
          <UsageRing
            value={performance.score}
            maxValue={100}
            label="Performance Score"
            color={tierColor}
          />
          <UsageRing
            value={performance.confidence}
            maxValue={100}
            label="Analysis Confidence"
            color={colors.primary}
          />
        </View>
      </View>

      {/* Performance Details Card */}
      <CapabilityCard
        title="Overall Performance"
        icon="speedometer-outline"
        tier={performance.tier}
        confidence={confidenceBars.performance}
        description={getCapabilityExplanation('performance', capabilities)}
      />

      {/* Gaming Capability Card */}
      <CapabilityCard
        title="Gaming Capability"
        icon="game-controller-outline"
        tier={gaming.tier}
        confidence={confidenceBars.gaming}
        description={gaming.description}
        // warnings={gaming.recommendedSettings}
      />

      {/* 4K Video Recording Card */}
      <CapabilityCard
        title="4K Video Recording"
        icon="videocam-outline"
        tier={videoRecording.tier}
        confidence={confidenceBars.videoRecording}
        description={`Status: ${videoRecording.status}`}
        // warnings={videoRecording.limitations}
        // recommendations={videoRecording.recommendations}
      />

      {/* Battery Stress Card */}
      <CapabilityCard
        title="Battery Endurance"
        icon="battery-charging-outline"
        tier={batteryStress.tier}
        confidence={confidenceBars.batteryStress}
        description={`${batteryStress.estimatedHeavyUsageMinutes} min heavy use`}
        // warnings={batteryStress.riskFactors}
      />

      {/* Daily Usage Pattern Card */}
      <CapabilityCard
        title="Daily Usage Pattern"
        icon="stats-chart-outline"
        tier={dailyUsage.tier}
        confidence={confidenceBars.dailyUsage}
        description={`${dailyUsage.pattern} user - ${dailyUsage.screenTime} screen time`}
      />

      {/* Feature Unlocks Section */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Available Features</Text>
        <View style={styles.featuresGrid}>
          {featureUnlocks.unlocked.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureCheck}>✓</Text>
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureName}>{feature.feature}</Text>
                <Text style={styles.featureTier}>Tier {feature.tierRequired}+</Text>
                <ConfidenceBar confidence={feature.confidence} size="small" />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Blocked Features Section */}
      {featureUnlocks.blocked.length > 0 && (
        <View style={styles.blockedSection}>
          <Text style={styles.sectionTitle}>Limited Features</Text>
          <View style={styles.blockedList}>
            {featureUnlocks.blocked.map((feature, index) => (
              <View key={index} style={styles.blockedItem}>
                <Text style={styles.blockedIcon}>⚠</Text>
                <View style={styles.blockedContent}>
                  <Text style={styles.blockedName}>{feature.feature}</Text>
                  <Text style={styles.blockedReason}>{feature.reason}</Text>
                  {feature.tierRequired && (
                    <Text style={styles.blockedTier}>Requires Tier {feature.tierRequired}+</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Gaming Quick Stats */}
      <View style={styles.gamingStatsSection}>
        <Text style={styles.sectionTitle}>Gaming Quick Stats</Text>
        <View style={styles.gamingStatsGrid}>
          <View style={styles.gamingStat}>
            <Text style={styles.gamingStatLabel}>AAA Games</Text>
            <View style={[
              styles.gamingStatValue, 
              { backgroundColor: gaming.canRunAAA ? colors.success + '20' : colors.error + '20' }
            ]}>
              <Text style={[
                styles.gamingStatText, 
                { color: gaming.canRunAAA ? colors.success : colors.error }
              ]}>
                {gaming.canRunAAA ? 'Runnable' : 'Not Recommended'}
              </Text>
            </View>
          </View>
          <View style={styles.gamingStat}>
            <Text style={styles.gamingStatLabel}>Popular Games</Text>
            <View style={[
              styles.gamingStatValue, 
              { backgroundColor: gaming.canRunPopular ? colors.success + '20' : colors.error + '20' }
            ]}>
              <Text style={[
                styles.gamingStatText, 
                { color: gaming.canRunPopular ? colors.success : colors.error }
              ]}>
                {gaming.canRunPopular ? 'Runs Well' : 'Limited'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Last Updated */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Last analyzed: {capabilities.lastUpdated.toLocaleTimeString()}
        </Text>
        <Text style={styles.footerNote}>
          All analysis performed locally on your device
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    padding: 24,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop:50,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  tierSection: {
    padding: 20,
    backgroundColor: colors.cardBackground,
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tierCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  tierLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  tierValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  tierDescription: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  ringsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
    paddingBottom: 10,
  },
  featuresSection: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    marginLeft: 4,
  },
  featuresGrid: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureCheck: {
    fontSize: 20,
    color: colors.success,
    fontWeight: 'bold',
  },
  featureContent: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  featureTier: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  blockedSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  blockedList: {
    gap: 12,
  },
  blockedItem: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  blockedIcon: {
    fontSize: 20,
    color: colors.warning,
    marginRight: 12,
  },
  blockedContent: {
    flex: 1,
  },
  blockedName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  blockedReason: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  blockedTier: {
    fontSize: 12,
    color: colors.gray,
  },
  gamingStatsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  gamingStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  gamingStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
  },
  gamingStatLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  gamingStatValue: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  gamingStatText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  footerNote: {
    fontSize: 11,
    color: colors.gray,
    textAlign: 'center',
  },
});

export default PerformanceScreen;