import { googleLogin, requestSignupOtp, verifySignupOtp } from '@/features/auth';
import { AuthFormStyles } from '@/shared/authFormStyles';
import { Colors } from '@/shared/theme';
import { isValidEmail, normalizeEmail } from '@/utils/validation';
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

let GoogleSignin: any = null;
let isSuccessResponse: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@react-native-google-signin/google-signin');
  GoogleSignin = mod.GoogleSignin;
  isSuccessResponse = mod.isSuccessResponse;
} catch {
  // Native module not available (e.g. Expo Go)
}

interface UserRegistrationScreenProps {
  onRegister: (userData: any) => void;
  onBackToLogin: () => void;
}

export default function UserRegistrationScreen({ 
  onRegister, 
  onBackToLogin
}: UserRegistrationScreenProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [showOtpStep, setShowOtpStep] = useState(false);
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!GoogleSignin || !googleClientId) {
      return;
    }

    GoogleSignin.configure({
      webClientId: googleClientId,
    });
  }, [googleClientId]);

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

    if (!isValidEmail(email)) {
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
      await requestSignupOtp({
        email: normalizeEmail(formData.email),
        password: formData.password,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
      });

      Alert.alert(
        'OTP Sent',
        'We sent a verification OTP to your email.',
      );
      setShowOtpStep(true);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the OTP code');
      return;
    }

    setIsLoading(true);

    try {
      const user = await verifySignupOtp(normalizeEmail(formData.email), otp.trim());
      Alert.alert(
        'Registration Successful!',
        'Your account has been verified and created successfully.',
        [
          {
            text: 'Continue',
            onPress: () => onRegister(user),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('OTP Verification Failed', error.message || 'Invalid OTP. Please try again.');
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
          onRegister(user);
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

          {showOtpStep ? (
            <>
              <View style={styles.otpInfoBox}>
                <Text style={styles.otpInfoText}>
                  Enter the verification OTP sent to {normalizeEmail(formData.email)}
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Verification OTP</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter OTP"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
                onPress={handleVerifyOtp}
                disabled={isLoading}
              >
                <Text style={styles.registerButtonText}>
                  {isLoading ? 'Verifying...' : 'Verify OTP & Create Account'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleRegister}
                disabled={isLoading}
              >
                <Text style={styles.loginLink}>Resend OTP</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={() => {
                  setShowOtpStep(false);
                  setOtp('');
                }}
                disabled={isLoading}
              >
                <Text style={styles.loginText}>Edit registration details</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
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
                  {isLoading ? 'Sending OTP...' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </>
          )}

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
    ...AuthFormStyles.screenContainer,
  },
  scrollContainer: {
    ...AuthFormStyles.scrollContainer,
  },
  logoContainer: {
    ...AuthFormStyles.logoContainer,
    marginBottom: 30,
  },
  appTitle: {
    ...AuthFormStyles.appTitle,
  },
  subtitle: {
    fontSize: 20,
    color: Colors.accent,
    fontWeight: '600',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 16,
    color: Colors.textTertiary,
    fontWeight: '300',
    textAlign: 'center',
  },
  formContainer: {
    ...AuthFormStyles.formContainer,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
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
    ...AuthFormStyles.dividerLine,
  },
  dividerText: {
    ...AuthFormStyles.dividerText,
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
    ...AuthFormStyles.inputContainer,
  },
  inputLabel: {
    ...AuthFormStyles.inputLabel,
  },
  input: {
    ...AuthFormStyles.input,
  },
  registerButton: {
    ...AuthFormStyles.primaryButton,
    marginTop: 10,
  },
  registerButtonDisabled: {
    ...AuthFormStyles.disabledButton,
  },
  registerButtonText: {
    ...AuthFormStyles.primaryButtonText,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginText: {
    ...AuthFormStyles.mutedText,
  },
  loginLink: {
    ...AuthFormStyles.linkText,
  },
  termsContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  termsText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  otpInfoBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  otpInfoText: {
    color: '#1E40AF',
    fontSize: 13,
    lineHeight: 18,
  },
  resendButton: {
    alignItems: 'center',
    marginBottom: 10,
  },
});
