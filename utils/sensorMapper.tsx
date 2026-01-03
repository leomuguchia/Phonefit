import * as Sensors from 'expo-sensors';
import * as Device from 'expo-device';
import { SENSOR_BENEFITS } from '../constants/tiers';

export class SensorMapper {
  static async detectAvailableSensors() {
    const sensors = [];
    
    // Check accelerometer
    try {
      const isAvailable = await Sensors.Accelerometer.isAvailableAsync();
      sensors.push({
        name: 'Accelerometer',
        available: isAvailable,
        benefit: SENSOR_BENEFITS.accelerometer,
        icon: 'move-outline',
      });
    } catch {
      sensors.push({
        name: 'Accelerometer',
        available: false,
        benefit: SENSOR_BENEFITS.accelerometer,
        icon: 'move-outline',
      });
    }
    
    // Check gyroscope
    try {
      const isAvailable = await Sensors.Gyroscope.isAvailableAsync();
      sensors.push({
        name: 'Gyroscope',
        available: isAvailable,
        benefit: SENSOR_BENEFITS.gyroscope,
        icon: 'git-compare-outline',
      });
    } catch {
      sensors.push({
        name: 'Gyroscope',
        available: false,
        benefit: SENSOR_BENEFITS.gyroscope,
        icon: 'git-compare-outline',
      });
    }
    
    // Check magnetometer (compass)
    try {
      const isAvailable = await Sensors.Magnetometer.isAvailableAsync();
      sensors.push({
        name: 'Compass',
        available: isAvailable,
        benefit: SENSOR_BENEFITS.magnetometer,
        icon: 'compass-outline',
      });
    } catch {
      sensors.push({
        name: 'Compass',
        available: false,
        benefit: SENSOR_BENEFITS.magnetometer,
        icon: 'compass-outline',
      });
    }
    
    // Check barometer
    try {
      const isAvailable = await Sensors.Barometer.isAvailableAsync();
      sensors.push({
        name: 'Barometer',
        available: isAvailable,
        benefit: SENSOR_BENEFITS.barometer,
        icon: 'speedometer-outline',
      });
    } catch {
      sensors.push({
        name: 'Barometer',
        available: false,
        benefit: SENSOR_BENEFITS.barometer,
        icon: 'speedometer-outline',
      });
    }
    
    // Check device features
    sensors.push({
      name: 'Fingerprint',
      available: Device.hasPlatformFeatureAsync('android.hardware.fingerprint'),
      benefit: SENSOR_BENEFITS.fingerprint,
      icon: 'finger-print-outline',
    });
    
    sensors.push({
      name: 'Face Unlock',
      available: false, // Simplified - would need actual face unlock detection
      benefit: SENSOR_BENEFITS.faceUnlock,
      icon: 'person-outline',
    });
    
    sensors.push({
      name: 'GPS',
      available: true, // Most phones have GPS
      benefit: SENSOR_BENEFITS.gps,
      icon: 'navigate-outline',
    });
    
    sensors.push({
      name: 'NFC',
      available: Device.hasPlatformFeatureAsync('android.hardware.nfc'),
      benefit: SENSOR_BENEFITS.nfc,
      icon: 'radio-outline',
    });
    
    sensors.push({
      name: 'Bluetooth',
      available: true, // Virtually all phones have Bluetooth
      benefit: SENSOR_BENEFITS.bluetooth,
      icon: 'bluetooth-outline',
    });
    
    return sensors;
  }
}