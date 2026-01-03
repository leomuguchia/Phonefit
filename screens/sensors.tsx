// Screens/SensorsScreen.js
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useDevice } from '../utils/deviceInfo';
import SensorCard from '../components/sensor';
import StepTracker from '../components/stepTracker';
import { colors } from '../constants/colors';
import Ionicons from 'react-native-vector-icons/Ionicons';
const IconsComponent = Ionicons as any;

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
  
  // Check if device has accelerometer (for step detection)
  const hasAccelerometer = availableSensors.some(s => 
    s.name.toLowerCase().includes('accelerometer')
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live Demos</Text>
          <Text style={styles.sectionSubtitle}>Interactive sensor utilities</Text>
        </View>
        
        {/* Step Tracker - Show if accelerometer is available */}
        {hasAccelerometer && <StepTracker />}
        
        {/* Available Sensors */}
        <View style={styles.sensorsHeader}>
          <Text style={styles.sensorsTitle}>Available Sensors</Text>
          <View style={styles.sensorsCountBadge}>
            <Text style={styles.sensorsCount}>{availableSensors.length}</Text>
          </View>
        </View>
        
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Other Capabilities</Text>
            <Text style={styles.sectionSubtitle}>
              These features aren't available on your device
            </Text>
          </View>
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
        <View style={styles.infoHeader}>
          <IconsComponent name="information-circle" size={20} color={colors.primary} />
          <Text style={styles.infoTitle}>How Sensors Work</Text>
        </View>
        <Text style={styles.infoText}>
          Your phone uses sensors to detect motion, orientation, light, and more. 
          These enable features like auto-rotation, step counting, and adaptive brightness.
        </Text>
        
        {hasAccelerometer && (
          <View style={styles.tipContainer}>
            <IconsComponent name="walk-outline" size={16} color={colors.success} />
            <Text style={styles.tipText}>
              Use the Step Tracker above to test your phone's motion sensing capabilities.
            </Text>
          </View>
        )}
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
    paddingTop: 50,
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
    marginTop: 16,
  },
  sectionHeader: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sensorsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  sensorsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  sensorsCountBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sensorsCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
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
    marginBottom: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.success + '10',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  tipText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
});

export default SensorsScreen;