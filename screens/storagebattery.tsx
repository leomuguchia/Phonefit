import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useDevice } from '../utils/deviceInfo';
import UsageRing from '../components/usageRing';
import { colors } from '../constants/colors';

const StorageBatteryScreen = () => {
  const { capabilities } = useDevice();
  console.log("Capabilities in StorageBatteryScreen:", capabilities);

  if (!capabilities) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const storage = capabilities.storage;
  const battery = capabilities.battery;
  
  // Check if storage data is available
  const hasStorageData = storage.total > 0;

  // Calculate percentages only if we have data
  const usedPercentage = hasStorageData ? (storage.used / storage.total) * 100 : 0;
  const freePercentage = hasStorageData ? (storage.free / storage.total) * 100 : 0;

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return 'Unknown';
    if (bytes >= 1024 ** 3) {
      return `${(bytes / (1024 ** 3)).toFixed(1)} GB`;
    } else if (bytes >= 1024 ** 2) {
      return `${(bytes / (1024 ** 2)).toFixed(1)} MB`;
    }
    return `${bytes} bytes`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Storage & Battery</Text>
        <Text style={styles.subtitle}>Your phone's capacity and endurance</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage</Text>
        <View style={styles.storageCard}>
          <View style={styles.storageHeader}>
            <Text style={styles.storageLabel}>Total Storage</Text>
            <Text style={styles.storageValue}>{formatBytes(storage.total)}</Text>
          </View>
          
          {hasStorageData ? (
            <>
              <View style={styles.ringsRow}>
                <UsageRing
                  value={usedPercentage}
                  maxValue={100}
                  label="Used"
                  color={colors.primary}
                />
                <UsageRing
                  value={freePercentage}
                  maxValue={100}
                  label="Free"
                  color={colors.accent}
                />
              </View>

              <View style={styles.storageDetails}>
                <View style={styles.storageDetail}>
                  <View style={[styles.colorDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.detailLabel}>Used: {formatBytes(storage.used)}</Text>
                </View>
                <View style={styles.storageDetail}>
                  <View style={[styles.colorDot, { backgroundColor: colors.accent }]} />
                  <Text style={styles.detailLabel}>Free: {formatBytes(storage.free)}</Text>
                </View>
              </View>

              <View style={styles.humanReadable}>
                <Text style={styles.humanReadableTitle}>What you can store:</Text>
                <View style={styles.humanReadableItem}>
                  <Text style={styles.humanReadableIcon}>🎬</Text>
                  <Text style={styles.humanReadableText}>{storage.humanReadable.movies}</Text>
                </View>
                <View style={styles.humanReadableItem}>
                  <Text style={styles.humanReadableIcon}>📸</Text>
                  <Text style={styles.humanReadableText}>{storage.humanReadable.photos}</Text>
                </View>
                <View style={styles.humanReadableItem}>
                  <Text style={styles.humanReadableIcon}>📱</Text>
                  <Text style={styles.humanReadableText}>{storage.humanReadable.apps}</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataIcon}>📊</Text>
              <Text style={styles.noDataTitle}>Storage Data Unavailable</Text>
              <Text style={styles.noDataText}>
                We couldn't access your storage information. This could be due to device permissions or platform limitations.
              </Text>
              <View style={styles.noDataInfo}>
                <Text style={styles.noDataInfoText}>
                  • Try restarting the app{'\n'}
                  • Check if storage permissions are granted{'\n'}
                  • Some devices may not expose storage info
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Battery</Text>
        <View style={styles.batteryCard}>
          <View style={styles.batteryHeader}>
            <Text style={styles.batteryHealthLabel}>Battery Health</Text>
            <View style={[styles.healthBadge, { 
              backgroundColor: 
                battery.health === 'Excellent' ? colors.success + '20' :
                battery.health === 'Good' ? colors.accent + '20' :
                battery.health === 'Fair' ? colors.warning + '20' : colors.error + '20'
            }]}>
              <Text style={[styles.healthText, { 
                color: 
                  battery.health === 'Excellent' ? colors.success :
                  battery.health === 'Good' ? colors.accent :
                  battery.health === 'Fair' ? colors.warning : colors.error
              }]}>
                {battery.health}
              </Text>
            </View>
          </View>

          <View style={styles.usageEstimates}>
            <Text style={styles.estimatesTitle}>Estimated Usage Time:</Text>
            
            <View style={styles.usageRow}>
              <View style={styles.usageType}>
                <View style={[styles.usageDot, { backgroundColor: colors.success }]} />
                <Text style={styles.usageLabel}>Light Use</Text>
              </View>
              <Text style={styles.usageTime}>{battery.estimatedUsage.light}</Text>
            </View>
            
            <View style={styles.usageRow}>
              <View style={styles.usageType}>
                <View style={[styles.usageDot, { backgroundColor: colors.accent }]} />
                <Text style={styles.usageLabel}>Normal Use</Text>
              </View>
              <Text style={styles.usageTime}>{battery.estimatedUsage.normal}</Text>
            </View>
            
            <View style={styles.usageRow}>
              <View style={styles.usageType}>
                <View style={[styles.usageDot, { backgroundColor: colors.warning }]} />
                <Text style={styles.usageLabel}>Heavy Use</Text>
              </View>
              <Text style={styles.usageTime}>{battery.estimatedUsage.heavy}</Text>
            </View>
          </View>

          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Battery Tips</Text>
            <Text style={styles.tip}>• Keep brightness at comfortable levels</Text>
            <Text style={styles.tip}>• Close unused apps in the background</Text>
            <Text style={styles.tip}>• Use dark mode when possible</Text>
            <Text style={styles.tip}>• Avoid extreme temperatures</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Estimates based on typical usage patterns. Actual results may vary.
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
    backgroundColor: colors.accent,
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
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  storageCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  storageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  storageValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 50,
  },
  storageDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  storageDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  humanReadable: {
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    paddingTop: 20,
  },
  humanReadableTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  humanReadableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  humanReadableIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  humanReadableText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  batteryCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  batteryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  batteryHealthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  healthBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  healthText: {
    fontSize: 14,
    fontWeight: '600',
  },
  usageEstimates: {
    marginBottom: 24,
  },
  estimatesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  usageType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  usageLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  usageTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  tips: {
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    paddingTop: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  tip: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
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
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noDataIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  noDataInfo: {
    backgroundColor: colors.lightGray + '50',
    padding: 12,
    borderRadius: 8,
    width: '100%',
  },
  noDataInfoText: {
    fontSize: 12,
    color: colors.darkGray,
    lineHeight: 18,
  },
});

export default StorageBatteryScreen;