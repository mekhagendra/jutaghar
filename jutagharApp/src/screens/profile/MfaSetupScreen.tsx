import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import api from '@/api';
import { getAuthState, getCurrentUser } from '@/features/auth';
import { Colors, Radius, Spacing, Typography } from '@/shared/theme';

type Step = 'overview' | 'scan' | 'codes' | 'disable';

interface MfaSetupScreenProps {
  onBack: () => void;
}

export default function MfaSetupScreen({ onBack }: MfaSetupScreenProps) {
  const initialMfaEnabled = getAuthState().user?.mfa?.enabled ?? false;

  const [mfaEnabled, setMfaEnabled] = useState(initialMfaEnabled);
  const [step, setStep] = useState<Step>('overview');

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [otpauthUri, setOtpauthUri] = useState('');
  const [showSetupKey, setShowSetupKey] = useState(false);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const setupKey = useMemo(() => {
    if (!otpauthUri) return '';
    const m = otpauthUri.match(/[?&]secret=([^&]+)/i);
    return m ? decodeURIComponent(m[1]) : '';
  }, [otpauthUri]);

  const resetSetup = () => {
    setQrDataUrl('');
    setOtpauthUri('');
    setCode('');
    setRecoveryCodes([]);
    setConfirmedSaved(false);
    setShowSetupKey(false);
    setError('');
  };

  const startSetup = async () => {
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post<{ qrDataUrl: string; otpauthUri: string }>('/api/auth/mfa/setup');
      setQrDataUrl(res.data.qrDataUrl);
      setOtpauthUri(res.data.otpauthUri);
      setCode('');
      setStep('scan');
    } catch (e: any) {
      setError(e.message || 'Failed to start MFA setup.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifySetup = async () => {
    if (code.length !== 6) return;
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post<{ recoveryCodes: string[] }>('/api/auth/mfa/verify', { code });
      setRecoveryCodes(res.data.recoveryCodes);
      setMfaEnabled(true);
      setStep('codes');
      try { await getCurrentUser(); } catch { /* non-fatal */ }
    } catch (e: any) {
      setError(e.message || 'Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const disable = async () => {
    if (!disablePassword || disableCode.length < 6) {
      setError('Enter your password and a 6-digit authenticator or recovery code.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await api.post('/api/auth/mfa/disable', { password: disablePassword, code: disableCode });
      setMfaEnabled(false);
      setDisablePassword('');
      setDisableCode('');
      try { await getCurrentUser(); } catch { /* non-fatal */ }
      setStep('overview');
      Alert.alert('MFA Disabled', 'Two-factor authentication has been turned off.');
    } catch (e: any) {
      setError(e.message || 'Failed to disable MFA.');
    } finally {
      setIsLoading(false);
    }
  };

  const shareSetupKey = async () => {
    if (!setupKey) return;
    try { await Share.share({ message: `JutaGhar MFA setup key: ${setupKey}` }); } catch { /* cancel */ }
  };

  const shareRecoveryCodes = async () => {
    if (!recoveryCodes.length) return;
    try {
      await Share.share({
        message: `JutaGhar — MFA recovery codes (each works once):\n\n${recoveryCodes.join('\n')}`,
      });
    } catch { /* cancel */ }
  };

  const finishCodes = () => {
    if (!confirmedSaved) {
      Alert.alert('Save your codes', 'Please confirm you have stored your recovery codes safely.');
      return;
    }
    resetSetup();
    setStep('overview');
  };

  const renderHeader = (title: string, subtitle?: string) => (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityLabel="Back">
        <Text style={styles.backBtnText}>←</Text>
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );

  const renderStepIndicator = (current: 1 | 2 | 3) => (
    <View style={styles.stepRow}>
      {[1, 2, 3].map(n => (
        <View key={n} style={styles.stepItem}>
          <View style={[styles.stepDot, current >= n && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, current >= n && styles.stepDotTextActive]}>{n}</Text>
          </View>
          {n < 3 ? <View style={[styles.stepLine, current > n && styles.stepLineActive]} /> : null}
        </View>
      ))}
    </View>
  );

  const ErrorBanner = error ? (
    <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
  ) : null;

  if (step === 'codes') {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        {renderHeader('Save Recovery Codes', 'Step 3 of 3')}
        <ScrollView contentContainerStyle={styles.content}>
          {renderStepIndicator(3)}
          <View style={styles.successBadge}>
            <Text style={styles.successBadgeText}>✓ Two-factor authentication enabled</Text>
          </View>
          <Text style={styles.sectionTitle}>Your recovery codes</Text>
          <Text style={styles.helperText}>
            Store these codes somewhere safe. Each one can be used <Text style={styles.bold}>once</Text> to
            sign in if you lose access to your authenticator app.
          </Text>
          <View style={styles.codesGrid}>
            {recoveryCodes.map(c => (
              <View key={c} style={styles.codeChip}>
                <Text style={styles.codeChipText}>{c}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.secondaryBtn} onPress={shareRecoveryCodes}>
            <Text style={styles.secondaryBtnText}>Share / Save codes</Text>
          </TouchableOpacity>
          <View style={styles.confirmRow}>
            <Switch
              value={confirmedSaved}
              onValueChange={setConfirmedSaved}
              trackColor={{ false: Colors.border, true: Colors.success }}
            />
            <Text style={styles.confirmText}>I have saved these codes in a safe place</Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, !confirmedSaved && styles.primaryBtnDisabled]}
            onPress={finishCodes}
            disabled={!confirmedSaved}
          >
            <Text style={styles.primaryBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (step === 'scan') {
    return (
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar style="dark" />
        {renderHeader('Set Up Authenticator', 'Step 1–2 of 3')}
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {renderStepIndicator(2)}
          <Text style={styles.sectionTitle}>1. Scan with an authenticator app</Text>
          <Text style={styles.helperText}>
            Use Google Authenticator, Authy, 1Password, or any TOTP app to scan the code below.
          </Text>
          <View style={styles.qrCard}>
            {qrDataUrl ? (
              <Image source={{ uri: qrDataUrl }} style={styles.qrImage} resizeMode="contain" />
            ) : (
              <ActivityIndicator size="large" color={Colors.primary} />
            )}
          </View>
          <TouchableOpacity onPress={() => setShowSetupKey(s => !s)} style={styles.linkBtn}>
            <Text style={styles.linkBtnText}>
              {showSetupKey ? 'Hide setup key' : "Can't scan? Show setup key"}
            </Text>
          </TouchableOpacity>
          {showSetupKey && setupKey ? (
            <View style={styles.keyBox}>
              <Text style={styles.keyText} selectable>{setupKey}</Text>
              <TouchableOpacity onPress={shareSetupKey} style={styles.keyShareBtn}>
                <Text style={styles.keyShareBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>2. Enter the 6-digit code</Text>
          <Text style={styles.helperText}>
            Open your authenticator app and enter the current code for JutaGhar.
          </Text>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={t => { setCode(t.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            placeholder="••••••"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            editable={!isLoading}
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
          />
          {ErrorBanner}
          <TouchableOpacity
            style={[styles.primaryBtn, (isLoading || code.length !== 6) && styles.primaryBtnDisabled]}
            onPress={verifySetup}
            disabled={isLoading || code.length !== 6}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Activate MFA</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => { resetSetup(); setStep('overview'); }}
            disabled={isLoading}
          >
            <Text style={styles.ghostBtnText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (step === 'disable') {
    return (
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar style="dark" />
        {renderHeader('Disable Two-Factor', 'Confirm your identity')}
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.warnBox}>
            <Text style={styles.warnText}>
              Disabling MFA will weaken your account security. You can re-enable it any time.
            </Text>
          </View>
          <Text style={styles.label}>Current password</Text>
          <TextInput
            style={styles.input}
            value={disablePassword}
            onChangeText={t => { setDisablePassword(t); setError(''); }}
            placeholder="Enter your password"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            editable={!isLoading}
            autoComplete="current-password"
          />
          <Text style={styles.label}>Authenticator code or recovery code</Text>
          <TextInput
            style={styles.input}
            value={disableCode}
            onChangeText={t => { setDisableCode(t.replace(/[^0-9a-zA-Z-]/g, '')); setError(''); }}
            placeholder="6-digit code or recovery code"
            placeholderTextColor={Colors.textMuted}
            keyboardType="default"
            autoCapitalize="none"
            editable={!isLoading}
          />
          {ErrorBanner}
          <TouchableOpacity
            style={[styles.dangerBtn, isLoading && styles.primaryBtnDisabled]}
            onPress={disable}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Disable MFA</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => { setStep('overview'); setError(''); }} disabled={isLoading}>
            <Text style={styles.ghostBtnText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      {renderHeader('Two-Factor Authentication', 'Extra security for your account')}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.statusCard, mfaEnabled ? styles.statusCardOn : styles.statusCardOff]}>
          <Text style={styles.statusIcon}>{mfaEnabled ? '🔒' : '🔓'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>{mfaEnabled ? 'MFA is enabled' : 'MFA is not enabled'}</Text>
            <Text style={styles.statusSubtitle}>
              {mfaEnabled
                ? 'You will be asked for a code from your authenticator app when you sign in.'
                : 'Protect your account by requiring a one-time code at sign-in.'}
            </Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>How it works</Text>
        <View style={styles.bulletRow}>
          <Text style={styles.bulletNum}>1</Text>
          <Text style={styles.bulletText}>Install an authenticator app (Google Authenticator, Authy, 1Password).</Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bulletNum}>2</Text>
          <Text style={styles.bulletText}>Scan the QR code we show you with that app.</Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bulletNum}>3</Text>
          <Text style={styles.bulletText}>Enter the 6-digit code to confirm and save your recovery codes.</Text>
        </View>
        {ErrorBanner}
        {mfaEnabled ? (
          <TouchableOpacity style={[styles.dangerBtn, { marginTop: Spacing.xl }]} onPress={() => { setError(''); setStep('disable'); }}>
            <Text style={styles.primaryBtnText}>Disable MFA</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: Spacing.xl }, isLoading && styles.primaryBtnDisabled]}
            onPress={startSetup}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Set up MFA</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 56 : Spacing.xl,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: { padding: Spacing.sm, marginRight: Spacing.sm },
  backBtnText: { fontSize: 22, color: Colors.textPrimary },
  headerTitle: { fontSize: Typography.xl, fontWeight: '700', color: Colors.textDark },
  headerSubtitle: { fontSize: Typography.sm, color: Colors.textTertiary, marginTop: 2 },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xl * 2 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepDotText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textTertiary },
  stepDotTextActive: { color: '#fff' },
  stepLine: { width: 40, height: 2, backgroundColor: Colors.border, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: Colors.primary },
  statusCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.lg, borderRadius: Radius.lg,
    marginBottom: Spacing.xl, borderWidth: 1,
  },
  statusCardOn: { backgroundColor: '#e8f8ef', borderColor: '#bfead0' },
  statusCardOff: { backgroundColor: '#fff7e6', borderColor: '#fde2b3' },
  statusIcon: { fontSize: 28, marginRight: Spacing.md },
  statusTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textDark, marginBottom: 2 },
  statusSubtitle: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 18 },
  sectionTitle: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textDark, marginBottom: Spacing.sm },
  helperText: { fontSize: Typography.base, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  bold: { fontWeight: '700', color: Colors.textDark },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  bulletNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primary, color: '#fff',
    textAlign: 'center', lineHeight: 24,
    fontSize: Typography.sm, fontWeight: '700',
    marginRight: Spacing.md, overflow: 'hidden',
  },
  bulletText: { flex: 1, fontSize: Typography.base, color: Colors.textSecondary, lineHeight: 20 },
  qrCard: {
    alignSelf: 'center', padding: Spacing.lg,
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.borderLight,
    marginBottom: Spacing.lg,
  },
  qrImage: { width: 200, height: 200 },
  linkBtn: { alignSelf: 'center', padding: Spacing.sm, marginBottom: Spacing.md },
  linkBtnText: { color: Colors.accent, fontSize: Typography.base, fontWeight: '600' },
  keyBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.inputBg, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  keyText: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: Typography.base, color: Colors.textPrimary, letterSpacing: 1,
  },
  keyShareBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    marginLeft: Spacing.sm,
  },
  keyShareBtnText: { color: '#fff', fontWeight: '600', fontSize: Typography.sm },
  codeInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl,
    fontSize: 28, letterSpacing: 12,
    textAlign: 'center', color: Colors.textDark,
    marginBottom: Spacing.lg,
  },
  primaryBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.sm, minHeight: 50,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: Typography.lg, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, paddingVertical: 12,
    alignItems: 'center', marginVertical: Spacing.md,
  },
  secondaryBtnText: { color: Colors.textPrimary, fontSize: Typography.base, fontWeight: '600' },
  ghostBtn: { paddingVertical: 14, alignItems: 'center', marginTop: Spacing.xs },
  ghostBtnText: { color: Colors.textTertiary, fontSize: Typography.base, fontWeight: '600' },
  dangerBtn: {
    backgroundColor: Colors.danger, borderRadius: Radius.lg,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.sm, minHeight: 50,
  },
  successBadge: {
    backgroundColor: '#e8f8ef',
    borderWidth: 1, borderColor: '#bfead0',
    borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  successBadgeText: { color: '#1f7a47', fontSize: Typography.base, fontWeight: '700', textAlign: 'center' },
  codesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  codeChip: {
    width: '48%', backgroundColor: Colors.inputBg,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  codeChipText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: Typography.base, color: Colors.textDark, letterSpacing: 1,
  },
  confirmRow: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg },
  confirmText: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary, marginLeft: Spacing.md },
  warnBox: {
    backgroundColor: '#fff3e6',
    borderWidth: 1, borderColor: '#ffd6a8',
    borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  warnText: { color: '#8a4b00', fontSize: Typography.base, lineHeight: 20 },
  label: { fontSize: Typography.base, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.sm },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
    fontSize: Typography.lg, color: Colors.textDark,
    marginBottom: Spacing.lg,
  },
  errorBox: {
    backgroundColor: '#fdecea',
    borderWidth: 1, borderColor: '#f5c2c0',
    borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: { color: '#a4231d', fontSize: Typography.base },
});
