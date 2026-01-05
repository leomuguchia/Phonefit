import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useDevice } from '../utils/deviceInfo';
import CapabilityCard from '../components/capability';
import { colors } from '../constants/colors';
import { TIERS } from '../constants/tiers';
import { momentEngine } from '../utils/momentsEngine';

type HighlightMoment = {
  id: string;
  emoji: string;
  title: string;
  description: string;
};

const HomeScreen = () => {
  const { deviceInfo, capabilities, loading, refresh, runtimeSignals } =
    useDevice();

  const [moment, setMoment] = useState<HighlightMoment | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchMoment = async () => {
      if (!deviceInfo || !capabilities || !runtimeSignals) {
        if (!cancelled) setMoment(null);
        return;
      }

      try {
        const result = await momentEngine.generateAndNotify(
          deviceInfo,
          capabilities,
          runtimeSignals
        );

        const activeMoments = Array.isArray(result?.moments)
          ? result.moments
          : [];

        if (!cancelled && activeMoments.length > 0) {
          const topMoment = activeMoments[0];
          setMoment({
            id: topMoment.id,
            emoji: topMoment.emoji,
            title: topMoment.title,
            description: topMoment.description ?? '',
          });
        } else if (!cancelled) {
          // Explicitly clear stale moment
          setMoment(null);
        }
      } catch (error) {
        console.warn('Failed to generate moment:', error);
        if (!cancelled) setMoment(null);
      }
    };

    fetchMoment();

    return () => {
      cancelled = true;
    };
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
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome to PhoneFit</Text>
        <Text style={styles.subtitle}>Let&apos;s explore what your phone can do</Text>
        {deviceInfo?.deviceName && (
          <Text style={styles.deviceName}>{deviceInfo.deviceName}</Text>
        )}
      </View>

      {/* Highlighted Moment */}
      {moment ? (
        <TouchableOpacity style={styles.highlightedMoment}>
          <Text style={styles.momentEmoji}>{moment.emoji}</Text>
          <Text style={styles.momentTitle}>{moment.title}</Text>
          <Text style={styles.momentDescription}>{moment.description}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.highlightedMomentIdle}>
          <Text style={styles.momentEmoji}>📱</Text>
          <Text style={styles.momentTitle}>All good</Text>
          <Text style={styles.momentDescription}>
            Your phone is running smoothly right now.
          </Text>
        </View>
      )}

      {/* Capability Cards */}
      {capabilities && (
        <>
          <CapabilityCard
            title="Performance"
            icon="speedometer-outline"
            tier={capabilities.performance?.tier}
            description={
              TIERS[
                capabilities.performance?.tier as keyof typeof TIERS
              ]?.sentence || 'Checking performance...'
            }
            confidence={capabilities.performance?.confidence ?? 0}
            onPress={() => handleCardPress('Performance')}
          />

          <CapabilityCard
            title="Gaming"
            icon="game-controller-outline"
            tier={capabilities.gaming?.tier}
            description={capabilities.gaming?.description ?? ''}
            confidence={capabilities.gaming?.confidence ?? 0}
            onPress={() => handleCardPress('Gaming')}
          />

          <CapabilityCard
            title="Battery"
            icon="battery-charging-outline"
            description={
              capabilities.battery?.estimatedUsage?.normal
                ? `Estimated: ${capabilities.battery.estimatedUsage.normal}`
                : 'Estimating battery usage...'
            }
            confidence={85}
            onPress={() => handleCardPress('Battery')}
            color={colors.accent}
          />

          <CapabilityCard
            title="Storage"
            icon="folder-outline"
            description={
              capabilities.storage?.humanReadable?.photos ??
              'Storage details unavailable'
            }
            confidence={90}
            onPress={() => handleCardPress('Storage')}
            color={colors.secondary}
          />

          <CapabilityCard
            title="Sensors"
            icon="eye-outline"
            description={`${
              capabilities.sensors?.filter(s => s.available).length ?? 0
            } sensors available`}
            confidence={95}
            onPress={() => handleCardPress('Sensors')}
            color={colors.primary}
          />

          <CapabilityCard
            title="Daily Usage"
            icon="stats-chart-outline"
            description={
              capabilities.dailyUsage
                ? `${capabilities.dailyUsage.pattern} user - ${capabilities.dailyUsage.screenTime}`
                : 'Analyzing usage patterns...'
            }
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
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  header: {
    padding: 24,
    paddingTop: 50,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  welcome: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },

  highlightedMoment: {
    backgroundColor: colors.primary + '30',
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  highlightedMomentIdle: {
    backgroundColor: colors.gray + '20',
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  momentEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  momentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  momentDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
  },
});

export default HomeScreen;
