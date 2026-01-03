// components/UnlockModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { verifyUnlockCode, getLicenseStatus } from '../license/verification';

interface Props {
  visible: boolean;
  onClose: () => void;
  onUnlockSuccess?: () => void;
  title?: string;
  description?: string;
}

export const UnlockModal: React.FC<Props> = ({
  visible,
  onClose,
  onUnlockSuccess,
  title = 'Unlock Premium Features',
  description = 'Enter your unlock code to access all premium features',
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState('');

  const loadInstructions = async () => {
    const status = await getLicenseStatus();
    setInstructions(status.instructions);
  };

  React.useEffect(() => {
    if (visible) {
      loadInstructions();
      setError(null);
      setCode('');
    }
  }, [visible]);

  const handleVerify = async () => {
    if (!code.trim()) {
      setError('Please enter a code');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await verifyUnlockCode(code);
    
    if (result.success) {
      // Success!
      if (onUnlockSuccess) {
        onUnlockSuccess();
      }
      
      // Show success message
      Alert.alert(
        'Success!',
        'Premium features are now unlocked!',
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              setCode('');
            },
          },
        ]
      );
    } else {
      setError(result.error || 'Invalid code');
    }
    
    setLoading(false);
  };

  const handlePurchase = () => {
    // Open website for purchase
    Linking.openURL('https://lioapps.com').catch(err => {
      Alert.alert('Error', 'Could not open website');
    });
  };

  const handleDemo = () => {
    // Auto-fill demo code for testing
    setCode('DEMO');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>
          
          <Text style={styles.description}>
            {description}
          </Text>
          
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructions}>
              {instructions}
            </Text>
          </View>
          
          <TextInput
            style={styles.input}
            placeholder="Enter unlock code (e.g., PHONEFIT-ROCKS)"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            editable={!loading}
            autoFocus
            placeholderTextColor="#999"
          />
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.error}>{error}</Text>
            </View>
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]} 
              onPress={handleVerify}
              disabled={loading || !code.trim()}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Unlock</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.footer}>
            <TouchableOpacity onPress={handlePurchase}>
              <Text style={styles.link}>Get a code from lioapps.com</Text>
            </TouchableOpacity>
            
            {__DEV__ && (
              <TouchableOpacity onPress={handleDemo} style={styles.demoButton}>
                <Text style={styles.demoText}>Try Demo Code</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  instructionsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  instructions: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fafafa',
    textAlign: 'center',
    letterSpacing: 1,
  },
  errorContainer: {
    backgroundColor: '#fee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  error: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  footer: {
    alignItems: 'center',
    gap: 12,
  },
  link: {
    color: '#007AFF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  demoButton: {
    padding: 8,
  },
  demoText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
});