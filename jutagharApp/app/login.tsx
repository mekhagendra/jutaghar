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
  View
} from 'react-native';
import { googleLogin, login } from '../lib/authStore';

let GoogleSignin: any = null;
let isSuccessResponse: any = null;
try {
  const mod = require('@react-native-google-signin/google-signin');
  GoogleSignin = mod.GoogleSignin;
  isSuccessResponse = mod.isSuccessResponse;
} catch (e) {
  // Native module not available (e.g. Expo Go)
}

interface LoginScreenProps {
  onLogin: (userData: any) => void;
  showBackButton?: boolean;
  onBack?: () => void;
  onBackToHome?: () => void;
  onGoToRegister?: () => void;
}

export default function LoginScreen({ onLogin, showBackButton = false, onBack, onBackToHome, onGoToRegister }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    GoogleSignin?.configure({
      webClientId: '624445426814-34tlek37luct6qheog99umjigohjuu2k.apps.googleusercontent.com',
    });
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const user = await login(email.trim().toLowerCase(), password);
      onLogin({
        ...user,
        userType: user.role === 'outlet' ? 'seller' : 'user',
      });
    } catch (error: any) {
      const msg = error.message || '';
      if (msg === 'Account is pending approval') {
        setPendingEmail(email.trim().toLowerCase());
      } else {
        Alert.alert('Login Failed', msg || 'Invalid credentials. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
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
          onLogin({
            ...user,
            userType: user.role === 'outlet' ? 'seller' : 'user',
          });
        }
      }
    } catch (error: any) {
      const msg = error.message || '';
      if (msg === 'Account is pending approval') {
        setPendingEmail('your Google account');
      } else if (error.code !== '12501') {
        // 12501 = user cancelled, don't show error
        Alert.alert('Google Sign-In Failed', msg || 'Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Password reset functionality will be implemented soon.');
  };

  const handleSignUp = () => {
    if (onGoToRegister) {
      onGoToRegister();
    } else {
      Alert.alert('Sign Up', 'Registration functionality will be implemented soon.');
    }
  };

  // Pending approval screen (matches web behavior)
  if (pendingEmail) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.pendingContainer}>
          <View style={styles.pendingIconContainer}>
            <Text style={styles.pendingIcon}>⏳</Text>
          </View>
          <Text style={styles.pendingTitle}>Account Pending Approval</Text>
          <Text style={styles.pendingMessage}>
            Your vendor account is currently under review. Our team will verify your details and activate your account shortly.
          </Text>
          <View style={styles.pendingEmailBox}>
            <Text style={styles.pendingEmailLabel}>Check your email</Text>
            <Text style={styles.pendingEmailText}>
              You'll receive a confirmation at <Text style={styles.pendingEmailBold}>{pendingEmail}</Text> once your account is activated.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => setPendingEmail(null)}
          >
            <Text style={styles.loginButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      
      {showBackButton && onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </TouchableOpacity>
      )}
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.appTitle}>JutaGhar</Text>
          <Text style={styles.subtitle}>Welcome Back</Text>
        </View>

        <View style={styles.formContainer}>

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Text style={styles.googleButtonIcon}>G</Text>
            <Text style={styles.googleButtonText}>Sign in with Google</Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or sign in with email</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity 
            style={styles.forgotPasswordButton}
            onPress={handleForgotPassword}
            disabled={isLoading}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleSignUp} disabled={isLoading}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {onBackToHome && (
            <TouchableOpacity 
              style={styles.backToHomeButton} 
              onPress={onBackToHome} 
              disabled={isLoading}
            >
              <Text style={styles.backToHomeButtonText}>🏠 Back to Home</Text>
            </TouchableOpacity>
          )}
          
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
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#7f8c8d',
    fontWeight: '300',
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
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#3498db',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: '#7f8c8d',
    fontSize: 16,
  },
  signupLink: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
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

  backToHomeButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  backToHomeButtonText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '700',
  },
  // Pending approval styles
  pendingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pendingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pendingIcon: {
    fontSize: 40,
  },
  pendingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  pendingMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  pendingEmailBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  pendingEmailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  pendingEmailText: {
    fontSize: 14,
    color: '#B45309',
    lineHeight: 20,
  },
  pendingEmailBold: {
    fontWeight: '700',
  },
});
