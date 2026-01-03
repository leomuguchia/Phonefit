import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useDevice } from '../utils/deviceInfo';
import CapabilityCard from '../components/capability';
import { colors } from '../constants/colors';
import { TIERS } from '../constants/tiers';
import { momentEngine } from '../utils/momentsEngine';

const HomeScreen = () => {
  const { deviceInfo, capabilities, loading, refresh, runtimeSignals } = useDevice();
  const [moment, setMoment] = useState<{id: string; emoji: string; title: string; description: string} | null>(null);

  useEffect(() => {
    const fetchMoment = async () => {
      if (!deviceInfo || !capabilities || !runtimeSignals) return;

      const { moments: activeMoments } = await momentEngine.generateAndNotify(
        deviceInfo,
        capabilities,
        runtimeSignals
      );

      // Take the highest-priority moment
      const topMoment = activeMoments[0];
      if (topMoment) {
        setMoment({
          id: topMoment.id,
          emoji: topMoment.emoji,
          title: topMoment.title,
          description: topMoment.description || '',
        });
      }
    };
    fetchMoment();
  }, [deviceInfo, capabilities, runtimeSignals]);

  const handleCardPress = (title: string) => {
    console.log(`Pressed ${title} card`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Getting to know your phone...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome to PhoneFit</Text>
        <Text style={styles.subtitle}>Let's explore what your phone can do</Text>
        {deviceInfo && <Text style={styles.deviceName}>{deviceInfo.deviceName}</Text>}
      </View>

      {/* Highlighted Single Moment */}
      {moment && (
        <TouchableOpacity style={styles.highlightedMoment}>
          <Text style={styles.momentEmoji}>{moment.emoji}</Text>
          <Text style={styles.momentTitle}>{moment.title}</Text>
          <Text style={styles.momentDescription}>{moment.description}</Text>
        </TouchableOpacity>
      )}

      {/* Capability Cards */}
      {capabilities && (
        <>
          <CapabilityCard
            title="Performance"
            icon="speedometer-outline"
            tier={capabilities.performance.tier}
            description={TIERS[capabilities.performance.tier as keyof typeof TIERS]?.sentence || 'Checking performance...'}
            confidence={capabilities.performance.confidence}
            onPress={() => handleCardPress('Performance')}
          />
          <CapabilityCard
            title="Gaming"
            icon="game-controller-outline"
            tier={capabilities.gaming.tier}
            description={capabilities.gaming.description}
            confidence={capabilities.gaming.confidence}
            onPress={() => handleCardPress('Gaming')}
          />
          <CapabilityCard
            title="Battery"
            icon="battery-charging-outline"
            description={`Estimated: ${capabilities.battery.estimatedUsage.normal}`}
            confidence={85}
            onPress={() => handleCardPress('Battery')}
            color={colors.accent}
          />
          <CapabilityCard
            title="Storage"
            icon="folder-outline"
            description={capabilities.storage.humanReadable.photos}
            confidence={90}
            onPress={() => handleCardPress('Storage')}
            color={colors.secondary}
          />
          <CapabilityCard
            title="Sensors"
            icon="eye-outline"
            description={`${capabilities.sensors.filter(s => s.available).length} sensors available`}
            confidence={95}
            onPress={() => handleCardPress('Sensors')}
            color={colors.primary}
          />
          <CapabilityCard
            title="Daily Usage"
            icon="stats-chart-outline"
            description={`${capabilities.dailyUsage.pattern} user - ${capabilities.dailyUsage.screenTime}`}
            confidence={75}
            onPress={() => handleCardPress('Daily Usage')}
            color={colors.warning}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              All analysis is done locally on your device. No data is collected.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { fontSize: 16, color: colors.textSecondary },

  header: { padding: 24, paddingTop: 50, backgroundColor: colors.primary, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  welcome: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.9)', marginBottom: 12 },
  deviceName: { fontSize: 18, fontWeight: '600', color: '#fff' },

  // Single highlighted moment
  highlightedMoment: {
    backgroundColor: colors.primary + '30',
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentEmoji: { fontSize: 40, marginBottom: 8 },
  momentTitle: { fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 4, textAlign: 'center' },
  momentDescription: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  footer: { padding: 20, alignItems: 'center' },
  footerText: { fontSize: 12, color: colors.gray, textAlign: 'center' },
});

export default HomeScreen;
