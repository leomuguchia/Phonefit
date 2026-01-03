import React from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './screens/home';
import PerformanceScreen from './screens/perfomance';
import SensorsScreen from './screens/sensors';
import StorageBatteryScreen from './screens/storagebattery';
import { DeviceProvider } from './utils/deviceInfo';
import { colors } from './constants/colors';
import { useMoments } from './utils/useMoments';

const IconsComponent = Ionicons as any;
const Tab = createBottomTabNavigator();

/* ----------------------------- */
/* Custom Bottom Tab Bar */
/* ----------------------------- */
const SimpleTabBar = ({ state, navigation }: any) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const isCenterTab = index === 1;

          const onPress = () => {
            if (!isFocused) navigation.navigate(route.name);
          };

          const icons: Record<string, string> = {
            Home: isFocused ? 'home' : 'home-outline',
            Performance: isFocused ? 'speedometer' : 'speedometer-outline',
            Sensors: isFocused ? 'eye' : 'eye-outline',
            'Storage & Battery': isFocused
              ? 'battery-charging'
              : 'battery-charging-outline',
          };

          const label =
            route.name === 'Storage & Battery' ? 'Storage' : route.name;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              {isCenterTab ? (
                <View style={styles.centerTabWrapper}>
                  <View
                    style={[
                      styles.centerButton,
                      isFocused && styles.centerButtonActive,
                    ]}
                  >
                    <IconsComponent
                      name={icons[route.name]}
                      size={26}
                      color={isFocused ? colors.primary : 'white'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.centerLabel,
                      isFocused && styles.centerLabelActive,
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              ) : (
                <>
                  <View
                    style={[
                      styles.iconContainer,
                      isFocused && styles.iconContainerActive,
                    ]}
                  >
                    <IconsComponent
                      name={icons[route.name]}
                      size={22}
                      color={
                        isFocused ? colors.primary : colors.textSecondary
                      }
                    />
                  </View>
                  <Text
                    style={[styles.label, isFocused && styles.labelActive]}
                  >
                    {label}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

/* ----------------------------- */
/* App Root */
/* ----------------------------- */
export default function App() {
  function MomentsBootstrap() {
    useMoments();
    return null;
  }

  return (
    <SafeAreaProvider>
      <DeviceProvider>
        <MomentsBootstrap />
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{ headerShown: false }}
            tabBar={(props) => <SimpleTabBar {...props} />}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Performance" component={PerformanceScreen} />
            <Tab.Screen name="Sensors" component={SensorsScreen} />
            <Tab.Screen
              name="Storage & Battery"
              component={StorageBatteryScreen}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </DeviceProvider>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

/* ----------------------------- */
/* Styles */
/* ----------------------------- */
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    paddingTop: 6,
  },
  tabBar: {
    flexDirection: 'row',
    minHeight: 60,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  iconContainerActive: {
    backgroundColor: colors.lightGray + '20',
  },
  label: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  centerTabWrapper: {
    alignItems: 'center',
    marginTop: -15,
  },
  centerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  centerButtonActive: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  centerLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 4,
  },
  centerLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
