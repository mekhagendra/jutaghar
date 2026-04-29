import { appleLogin, googleLogin, login, mfaLoginVerify, requestForgotPasswordOtp, verifyForgotPasswordOtp } from '@/features/auth';
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
  View
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

let AppleAuthentication: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AppleAuthentication = require('expo-apple-authentication');
} catch {
  // Native module not available
}

interface LoginScreenProps {
  onLogin: (userData: any) => void;
  onGoToRegister?: () => void;
}

export default function LoginScreen({ onLogin, onGoToRegister }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');

  // MFA second-step state
  const [mfaPending, setMfaPending] = useState<{ mfaToken: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  useEffect(() => {
    if (!GoogleSignin || !googleClientId) {
      return;
    }

    try {
      GoogleSignin.configure({
        webClientId: googleClientId,
        // iosClientId is required on iOS; without it, sign-in crashes when invoked.
        ...(Platform.OS === 'ios' && googleIosClientId ? { iosClientId: googleIosClientId } : {}),
      });
    } catch {
      // Configuration failure should never crash the screen.
    }
  }, [googleClientId, googleIosClientId]);

  useEffect(() => {
    let cancelled = false;
    if (Platform.OS !== 'ios' || !AppleAuthentication?.isAvailableAsync) {
      return;
    }
    AppleAuthentication.isAvailableAsync()
      .then((available: boolean) => {
        if (!cancelled) setAppleAuthAvailable(!!available);
      })
      .catch(() => {
        if (!cancelled) setAppleAuthAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(normalizeEmail(email), password);
      if ('mfa_required' in result && result.mfa_required) {
        setMfaPending({ mfaToken: result.mfa_token });
        return;
      }
      onLogin(result);
    } catch (error: any) {
      const msg = error.message || '';
      if (msg === 'Account is pending approval') {
        setPendingEmail(normalizeEmail(email));
      } else if (msg.toLowerCase().includes('invalid credentials')) {
        Alert.alert('Sign-In Failed', 'The email or password you entered is incorrect. Please verify your details and try again.');
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
    if (Platform.OS === 'ios' && !googleIosClientId) {
      Alert.alert(
        'Google Sign-In Unavailable',
        'Google Sign-In is not configured for this build. Please use email/password or Sign in with Apple.'
      );
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
          onLogin(user);
        }
      }
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg === 'Account is pending approval') {
        setPendingEmail('your Google account');
      } else if (error?.code !== '12501') {
        // 12501 = user cancelled, don't show error
        Alert.alert('Google Sign-In Failed', msg || 'Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (!AppleAuthentication) {
      Alert.alert('Not Available', 'Sign in with Apple requires a development build.');
      return;
    }
    setIsLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential?.identityToken) {
        throw new Error('No identity token returned by Apple.');
      }
      const user = await appleLogin({
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode ?? null,
        user: credential.user ?? null,
        email: credential.email ?? null,
        fullName: credential.fullName
          ? {
              givenName: credential.fullName.givenName ?? null,
              familyName: credential.fullName.familyName ?? null,
            }
          : null,
      });
      onLogin(user);
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled, no message needed.
        return;
      }
      const msg = error?.message || '';
      if (msg === 'Account is pending approval') {
        setPendingEmail('your Apple account');
      } else {
        Alert.alert('Apple Sign-In Failed', msg || 'Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaVerify = async () => {
    if (!mfaPending || !mfaCode.trim()) return;
    setIsLoading(true);
    try {
      const user = await mfaLoginVerify(mfaPending.mfaToken, mfaCode.trim());
      onLogin(user);
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setForgotEmail(normalizeEmail(email));
    setShowForgotPassword(true);
    setForgotStep('request');
  };

  const handleForgotRequest = async () => {
    if (!isValidEmail(forgotEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      await requestForgotPasswordOtp(normalizeEmail(forgotEmail));
      setForgotStep('verify');
      Alert.alert('OTP Sent', 'If this email is registered, an OTP has been sent.');
    } catch (error: any) {
      Alert.alert('Failed', error.message || 'Failed to request OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotVerify = async () => {
    if (!forgotOtp.trim()) {
      Alert.alert('Error', 'Please enter the OTP code');
      return;
    }

    if (forgotNewPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await verifyForgotPasswordOtp(normalizeEmail(forgotEmail), forgotOtp.trim(), forgotNewPassword);
      Alert.alert('Success', 'Password reset successful. You can now log in with your new password.');
      setShowForgotPassword(false);
      setForgotStep('request');
      setForgotOtp('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Failed', error.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    if (onGoToRegister) {
      onGoToRegister();
    } else {
      Alert.alert('Sign Up', 'Registration functionality will be implemented soon.');
    }
  };

  // MFA second-step screen
  if (mfaPending) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Two-Factor Authentication</Text>
            <Text style={styles.subtitle}>Enter the 6-digit code from your authenticator app</Text>
          </View>
          <View style={styles.formContainer}>
            <TextInput
              style={[AuthFormStyles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 8 }]}
              placeholder="000000"
              value={mfaCode}
              onChangeText={text => setMfaCode(text.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={8}
              autoFocus
            />
            <TouchableOpacity
              style={[AuthFormStyles.primaryButton, (isLoading || mfaCode.length < 6) && AuthFormStyles.disabledButton]}
              onPress={handleMfaVerify}
              disabled={isLoading || mfaCode.length < 6}
            >
              <Text style={AuthFormStyles.primaryButtonText}>{isLoading ? 'Verifying…' : 'Verify'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[AuthFormStyles.primaryButton, { backgroundColor: Colors.disabledBg }]}
              onPress={() => { setMfaPending(null); setMfaCode(''); }}
            >
              <Text style={[AuthFormStyles.primaryButtonText, { color: Colors.textPrimary }]}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
            Your seller account is currently under review. Our team will verify your details and activate your account shortly.
          </Text>
          <View style={styles.pendingEmailBox}>
            <Text style={styles.pendingEmailLabel}>Check your email</Text>
            <Text style={styles.pendingEmailText}>
              You&apos;ll receive a confirmation at <Text style={styles.pendingEmailBold}>{pendingEmail}</Text> once your account is activated.
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
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.appTitle}>JutaGhar</Text>
          <Text style={styles.subtitle}>Welcome Back</Text>
        </View>

        <View style={styles.formContainer}>
          {showForgotPassword ? (
            <View style={styles.forgotPasswordContainer}>
              <Text style={styles.forgotTitle}>Reset Your Password</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!isLoading}
                />
              </View>

              {forgotStep === 'verify' ? (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>OTP</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter OTP"
                      value={forgotOtp}
                      onChangeText={setForgotOtp}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter new password"
                      value={forgotNewPassword}
                      onChangeText={setForgotNewPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Confirm New Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm new password"
                      value={forgotConfirmPassword}
                      onChangeText={setForgotConfirmPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                    onPress={handleForgotVerify}
                    disabled={isLoading}
                  >
                    <Text style={styles.loginButtonText}>
                      {isLoading ? 'Resetting...' : 'Verify OTP & Reset'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.requestOtpLinkButton}
                    onPress={() => {
                      setForgotStep('request');
                      setForgotOtp('');
                    }}
                    disabled={isLoading}
                  >
                    <Text style={styles.forgotPasswordText}>Request new OTP</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                  onPress={handleForgotRequest}
                  disabled={isLoading}
                >
                  <Text style={styles.loginButtonText}>
                    {isLoading ? 'Sending OTP...' : 'Send OTP'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.backToLoginButton}
                onPress={() => {
                  setShowForgotPassword(false);
                  setForgotStep('request');
                }}
                disabled={isLoading}
              >
                <Text style={styles.forgotPasswordText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>

          {/* Sign in with Apple (iOS only) — required by App Store guideline 4.8 */}
          {Platform.OS === 'ios' && appleAuthAvailable && AppleAuthentication?.AppleAuthenticationButton && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={8}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )}

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Text style={styles.googleButtonIcon}>G</Text>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
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
            <Text style={styles.signupText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={handleSignUp} disabled={isLoading}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
            </>
          )}
          
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
  },
  appTitle: {
    ...AuthFormStyles.appTitle,
  },
  subtitle: {
    ...AuthFormStyles.subtitle,
  },
  headerContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 6,
  },
  formContainer: {
    ...AuthFormStyles.formContainer,
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
  appleButton: {
    width: '100%',
    height: 48,
    marginBottom: 12,
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
  inputContainer: {
    ...AuthFormStyles.inputContainer,
  },
  inputLabel: {
    ...AuthFormStyles.inputLabel,
  },
  input: {
    ...AuthFormStyles.input,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPasswordContainer: {
    width: '100%',
  },
  forgotTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  requestOtpLinkButton: {
    alignItems: 'center',
    marginBottom: 14,
  },
  backToLoginButton: {
    alignItems: 'center',
  },
  loginButton: {
    ...AuthFormStyles.primaryButton,
  },
  loginButtonDisabled: {
    ...AuthFormStyles.disabledButton,
  },
  loginButtonText: {
    ...AuthFormStyles.primaryButtonText,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    ...AuthFormStyles.mutedText,
  },
  signupLink: {
    ...AuthFormStyles.linkText,
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
