// components/StepTracker.js (Ultra Minimal - Meters)
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { Pedometer, Accelerometer } from 'expo-sensors';
import { colors } from '../constants/colors';
import Ionicons from 'react-native-vector-icons/Ionicons';
const IconsComponent = Ionicons as any;

const StepTracker = () => {
  const [isActive, setIsActive] = useState(false);
  const [steps, setSteps] = useState(0);
  const [available, setAvailable] = useState<'checking' | 'pedometer' | 'accelerometer' | 'none'>('checking');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const accelSubscriptionRef = useRef<any>(null);
  const pedometerSubscriptionRef = useRef<any>(null);
  const lastStepTime = useRef(Date.now());
  const stepHistory = useRef<number[]>([]);

  useEffect(() => {
    checkAvailability();
    return () => {
      stopTracking();
    };
  }, []);

  const checkAvailability = async () => {
    try {
      // Try hardware pedometer first
      const isPedometerAvailable = await Pedometer.isAvailableAsync();
      
      if (isPedometerAvailable) {
        setAvailable('pedometer');
      } else {
        // Fallback to accelerometer
        const isAccelerometerAvailable = await Accelerometer.isAvailableAsync();
        setAvailable(isAccelerometerAvailable ? 'accelerometer' : 'none');
      }
    } catch (error) {
      console.error('Sensor check error:', error);
      setAvailable('none');
    }
  };

  const startTracking = async () => {
    if (isActive || available === 'none') return;
    
    setIsActive(true);
    setSteps(0);
    stepHistory.current = [];
    
    try {
      if (available === 'pedometer') {
        startPedometerTracking();
      } else if (available === 'accelerometer') {
        startAccelerometerTracking();
      }
    } catch (error) {
      console.error('Start tracking error:', error);
      setIsActive(false);
    }
  };

  const startPedometerTracking = async () => {
    try {
      const subscription = Pedometer.watchStepCount(result => {
        const newSteps = result.steps;
        setSteps(newSteps);
        triggerPulse();
      });
      pedometerSubscriptionRef.current = subscription;
    } catch (error) {
      console.error('Pedometer error:', error);
      fallbackToAccelerometer();
    }
  };

  const startAccelerometerTracking = async () => {
    try {
      Accelerometer.setUpdateInterval(100);
      const subscription = Accelerometer.addListener(({ x, y, z }) => {
        if (!isActive) return;
        
        const acceleration = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();
        
        // Simple step detection
        if (acceleration > 1.3 && now - lastStepTime.current > 300) {
          lastStepTime.current = now;
          setSteps(prev => prev + 1);
          triggerPulse();
        }
      });
      accelSubscriptionRef.current = subscription;
    } catch (error) {
      console.error('Accelerometer error:', error);
      setIsActive(false);
    }
  };

  const fallbackToAccelerometer = async () => {
    try {
      const isAccelerometerAvailable = await Accelerometer.isAvailableAsync();
      if (isAccelerometerAvailable) {
        setAvailable('accelerometer');
        startAccelerometerTracking();
      } else {
        setAvailable('none');
        setIsActive(false);
        Alert.alert('Tracking Error', 'Unable to start step tracking');
      }
    } catch (error) {
      setAvailable('none');
      setIsActive(false);
    }
  };

  const stopTracking = () => {
    if (pedometerSubscriptionRef.current) {
      pedometerSubscriptionRef.current.remove();
      pedometerSubscriptionRef.current = null;
    }
    if (accelSubscriptionRef.current) {
      accelSubscriptionRef.current.remove();
      accelSubscriptionRef.current = null;
    }
    setIsActive(false);
  };

  const toggleTracking = () => {
    if (isActive) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  const resetSteps = () => {
    if (steps > 0) {
      Alert.alert(
        'Reset Steps',
        'Reset step count?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Reset', 
            style: 'destructive', 
            onPress: () => {
              setSteps(0);
              if (isActive) {
                lastStepTime.current = Date.now();
                stepHistory.current = [];
              }
            }
          }
        ]
      );
    }
  };

  const triggerPulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.05,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getStatusColor = () => {
    if (available === 'none') return colors.error;
    return isActive ? colors.success : colors.textSecondary;
  };

  const getMethodIcon = () => {
    switch (available) {
      case 'pedometer': return 'hardware-chip-outline';
      case 'accelerometer': return 'phone-portrait-outline';
      case 'none': return 'alert-circle-outline';
      default: return 'time-outline';
    }
  };

  // Calculations
  const calories = Math.round(steps * 0.04);
  const distanceMeters = Math.round(steps * 0.762); // 0.762 meters per step
  
  // Format distance: show meters up to 999, then kilometers
  const formatDistance = () => {
    if (distanceMeters < 1000) {
      return `${distanceMeters}m`;
    } else {
      return `${(distanceMeters / 1000).toFixed(1)}km`;
    }
  };

  const pulseScale = pulseAnim;

  if (available === 'checking') {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <IconsComponent name="time-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.title}>Step Tracker</Text>
          </View>
          <View style={styles.loadingDot} />
        </View>
        <Text style={styles.statusText}>Checking sensors...</Text>
      </View>
    );
  }

  if (available === 'none') {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <IconsComponent name="alert-circle-outline" size={18} color={colors.error} />
            <Text style={styles.title}>Step Tracker</Text>
          </View>
        </View>
        <Text style={styles.statusText}>Step tracking unavailable</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={checkAvailability}
        >
          <IconsComponent name="refresh-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <IconsComponent 
            name={getMethodIcon()} 
            size={18} 
            color={getStatusColor()} 
          />
          <Text style={styles.title}>Step Tracker</Text>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        </View>
        
        <TouchableOpacity 
          style={[
            styles.toggleBtn,
            { backgroundColor: isActive ? colors.error + '15' : colors.success + '15' }
          ]}
          onPress={toggleTracking}
          disabled={!available}
        >
          <IconsComponent 
            name={isActive ? "pause" : "play"} 
            size={14} 
            color={isActive ? colors.error : colors.success} 
          />
          <Text style={[
            styles.toggleText,
            { color: isActive ? colors.error : colors.success }
          ]}>
            {isActive ? 'Stop' : 'Start'}
          </Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.stats, { transform: [{ scale: pulseScale }] }]}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{steps}</Text>
            <Text style={styles.statLabel}>Steps</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{calories}</Text>
            <Text style={styles.statLabel}>Cal</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{formatDistance()}</Text>
            <Text style={styles.statLabel}>Dist</Text>
          </View>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={resetSteps}
          disabled={steps === 0}
        >
          <IconsComponent 
            name="refresh" 
            size={14} 
            color={steps === 0 ? colors.textSecondary : colors.textSecondary} 
          />
        </TouchableOpacity>
        
        <Text style={styles.statusText}>
          {available === 'pedometer' ? 'Hardware tracking' : 'Motion detection'}
          {isActive ? ' • Active' : ' • Ready'}
        </Text>
        
        {available === 'accelerometer' && isActive && (
          <IconsComponent name="walk-outline" size={14} color={colors.success} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stats: {
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background + '40',
    borderRadius: 10,
    paddingVertical: 10,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.lightGray + '80',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray + '40',
    paddingTop: 10,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.lightGray + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 6,
    backgroundColor: colors.lightGray + '20',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});

export default StepTracker;