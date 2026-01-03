import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useDevice } from '../utils/deviceInfo';
import SensorCard from '../components/sensor';
import { colors } from '../constants/colors';

const SensorsScreen = () => {
  const { capabilities } = useDevice();

  if (!capabilities) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading sensors...</Text>
      </View>
    );
  }

  const availableSensors = capabilities.sensors.filter(s => s.available);
  const unavailableSensors = capabilities.sensors.filter(s => !s.available);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Phone Sensors</Text>
        <Text style={styles.subtitle}>What your phone can sense about the world</Text>
        
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{availableSensors.length}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{unavailableSensors.length}</Text>
            <Text style={styles.statLabel}>Not Available</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{capabilities.sensors.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Sensors</Text>
        {availableSensors.length > 0 ? (
          availableSensors.map((sensor, index) => (
            <SensorCard
              key={index}
              name={sensor.name}
              benefit={sensor.benefit}
              available={sensor.available}
              icon={sensor.icon}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No sensors detected</Text>
          </View>
        )}
      </View>

      {unavailableSensors.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other Capabilities</Text>
          <Text style={styles.sectionSubtitle}>
            These features aren't available on your device
          </Text>
          {unavailableSensors.map((sensor, index) => (
            <SensorCard
              key={index}
              name={sensor.name}
              benefit={sensor.benefit}
              available={sensor.available}
              icon={sensor.icon}
            />
          ))}
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>How sensors help you</Text>
        <Text style={styles.infoText}>
          Sensors make your phone smarter. They enable features like automatic screen rotation, 
          step counting, navigation, secure unlocking, and adaptive brightness.
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
  },
  header: {
    padding: 24,
    backgroundColor: colors.secondary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop:50,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 16,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 16,
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  infoBox: {
    backgroundColor: colors.primary + '10',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default SensorsScreen;