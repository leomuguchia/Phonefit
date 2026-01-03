import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../constants/colors';
import type { SensorCardProps } from '../types';
const IconsComponent = Ionicons as any;

const SensorCard: React.FC<SensorCardProps> = ({ name, benefit, available, icon }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconNameContainer}>
          <View style={[styles.iconContainer, { 
            backgroundColor: available ? colors.success + '20' : colors.lightGray 
          }]}>
            <IconsComponent 
              name={icon} 
              size={20} 
              color={available ? colors.success : colors.gray} 
            />
          </View>
          <Text style={styles.name}>{name}</Text>
        </View>
        <View style={[styles.statusBadge, { 
          backgroundColor: available ? colors.success + '20' : colors.lightGray 
        }]}>
          <Text style={[styles.statusText, { 
            color: available ? colors.success : colors.gray 
          }]}>
            {available ? 'Available' : 'Not Available'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.benefit}>{benefit}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  benefit: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default SensorCard;