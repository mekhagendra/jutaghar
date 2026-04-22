import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { googleLogin, register } from '../lib/authStore';

let GoogleSignin: any = null;
let isSuccessResponse: any = null;
try {
  const mod = require('@react-native-google-signin/google-signin');
  GoogleSignin = mod.GoogleSignin;
  isSuccessResponse = mod.isSuccessResponse;
} catch (e) {
  // Native module not available (e.g. Expo Go)
}

interface UserRegistrationScreenProps {
  onRegister: (userData: any) => void;
  onBackToLogin: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function UserRegistrationScreen({ 
  onRegister, 
  onBackToLogin, 
  showBackButton = false, 
  onBack 
}: UserRegistrationScreenProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    GoogleSignin?.configure({
      webClientId: '624445426814-34tlek37luct6qheog99umjigohjuu2k.apps.googleusercontent.com',
    });
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const { fullName, email, phone, password, confirmPassword } = formData;

    if (!fullName.trim() || !email.trim() || !phone.trim() || 
        !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const user = await register({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
      });

      Alert.alert(
        'Registration Successful!', 
        'Your account has been created successfully.',
        [
          {
            text: 'Continue',
            onPress: () => onRegister({ ...user, userType: 'user' })
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!GoogleSignin) {
      Alert.alert('Not Available', 'Google Sign-In requires a development build. It is not supported in Expo Go.');
      return;
    }
    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response)) {
        const idToken = response.data.idToken;
        if (idToken) {
          const user = await googleLogin(idToken);
          onRegister({ ...user, userType: 'user' });
        }
      }
    } catch (error: any) {
      if (error.code !== '12501') {
        Alert.alert('Google Sign-Up Failed', error.message || 'Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      
      {showBackButton && onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      )}
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.appTitle}>JutaGhar</Text>
          <Text style={styles.subtitle}>Create Your Account</Text>
          <Text style={styles.welcomeText}>Join us and start your journey!</Text>
        </View>

        <View style={styles.formContainer}>

          {/* Google Sign-Up Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignUp}
            disabled={isLoading}
          >
            <Text style={styles.googleButtonIcon}>G</Text>
            <Text style={styles.googleButtonText}>Sign up with Google</Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or register with email</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={formData.fullName}
              onChangeText={(value) => handleInputChange('fullName', value)}
              autoCapitalize="words"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              keyboardType="phone-pad"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange('confirmPassword', value)}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.registerButtonText}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={onBackToLogin} disabled={isLoading}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#3498db',
    fontWeight: '600',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '300',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  googleButtonIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#7f8c8d',
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 1,
    marginRight: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  registerButton: {
    backgroundColor: '#3498db',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  registerButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginText: {
    color: '#7f8c8d',
    fontSize: 16,
  },
  loginLink: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
  termsContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  termsText: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    lineHeight: 18,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 12,
  },
  backButtonText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
});
