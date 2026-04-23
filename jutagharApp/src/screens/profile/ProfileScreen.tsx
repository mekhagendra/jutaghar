import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Header from '@/shared/components/Header';
import MfaSetupScreen from './MfaSetupScreen';
import api from '@/api';
import { getAuthState, getCurrentUser } from '@/features/auth';

interface ProfileScreenProps {
  userData: any;
  onLogout: () => void;
  onViewOrders: () => void;
  resetToken?: number;
}

type ProfileView = 'menu' | 'edit-profile' | 'change-password' | 'mfa-setup';

export default function ProfileScreen({ userData, onLogout, onViewOrders, resetToken = 0 }: ProfileScreenProps) {
  const authState = getAuthState();
  const user = authState.user;
  const [currentView, setCurrentView] = useState<ProfileView>('menu');

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordStep, setChangePasswordStep] = useState<'form' | 'otp'>('form');
  const [changePasswordOtp, setChangePasswordOtp] = useState('');
  const [showAccountInfo, setShowAccountInfo] = useState(false);

  const sellerRequestStatus = user?.vendorRequest?.status;
  const isSellerRequestPending = sellerRequestStatus === 'pending';
  const isCustomer = user?.role === 'customer';

  useEffect(() => {
    setCurrentView('menu');
    setShowAccountInfo(false);
  }, [resetToken]);

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return;
    }
    setIsSaving(true);
    try {
      await api.put('/api/auth/profile', { fullName, phone });
      await getCurrentUser();
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePasswordRequest = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.post('/api/auth/change-password/request-otp', { currentPassword, newPassword });
      setChangePasswordStep('otp');
      setChangePasswordOtp('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleChangePasswordVerify = async () => {
    if (!changePasswordOtp.trim()) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.post('/api/auth/change-password/verify-otp', { otp: changePasswordOtp.trim() });
      Alert.alert('Success', 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangePasswordOtp('');
      setChangePasswordStep('form');
      setCurrentView('menu');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify OTP');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleBecomeSeller = () => {
    Alert.alert(
      'Become a Seller',
      'Would you like to register as a seller on JutaGhar? You can list and sell your products to customers across Nepal.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply Now',
          onPress: async () => {
            try {
              await api.post('/api/auth/vendor-request', {});
              Alert.alert('Application Submitted', 'Your seller application has been submitted. We will review it and get back to you via email.');
            } catch {
              Alert.alert('Info', 'Seller registration request noted. We will contact you via email.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: onLogout },
    ]);
  };

  // Edit Profile sub-view
  if (currentView === 'edit-profile') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <Header />
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Enter full name" />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.disabledInput}>
                <Text style={styles.disabledText}>{user?.email}</Text>
              </View>
              <Text style={styles.hint}>Email cannot be changed</Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
            </View>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.disabledButton]}
              onPress={handleSaveProfile}
              disabled={isSaving}
            >
              {isSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Change Password sub-view
  if (currentView === 'change-password') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <Header />
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            {changePasswordStep === 'form' ? (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Current Password</Text>
                  <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" secureTextEntry />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="New password" secureTextEntry />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" secureTextEntry />
                </View>
                <TouchableOpacity
                  style={[styles.changePasswordButton, isChangingPassword && styles.disabledButton]}
                  onPress={handleChangePasswordRequest}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.changePasswordText}>Send OTP</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.hint}>An OTP has been sent to your email. Enter it below to confirm the password change.</Text>
                <View style={[styles.formGroup, { marginTop: 14 }]}>
                  <Text style={styles.label}>OTP</Text>
                  <TextInput
                    style={styles.input}
                    value={changePasswordOtp}
                    onChangeText={setChangePasswordOtp}
                    placeholder="Enter OTP"
                    keyboardType="number-pad"
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  style={[styles.changePasswordButton, isChangingPassword && styles.disabledButton]}
                  onPress={handleChangePasswordVerify}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.changePasswordText}>Confirm Change</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setChangePasswordStep('form')}>
                  <Text style={{ color: '#3498db', fontSize: 14 }}>Back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Menu view (default)
    // MFA Setup sub-view
    if (currentView === 'mfa-setup') {
      return <MfaSetupScreen onBack={() => setCurrentView('menu')} />;
    }

    // Menu view (default)
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Header />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar & Info */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.fullName}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {isCustomer && (
            <TouchableOpacity style={styles.menuItem} onPress={onViewOrders} activeOpacity={0.6}>
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuIcon}>📦</Text>
                <Text style={styles.menuLabel}>My Orders</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.menuItem} onPress={() => setCurrentView('edit-profile')} activeOpacity={0.6}>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuIcon}>👤</Text>
              <Text style={styles.menuLabel}>Update Profile</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setShowAccountInfo((prev) => !prev)} activeOpacity={0.6}>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuIcon}>ℹ️</Text>
              <Text style={styles.menuLabel}>Account Info</Text>
            </View>
            <Text style={styles.menuArrow}>{showAccountInfo ? '⌃' : '›'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setCurrentView('change-password')} activeOpacity={0.6}>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuIcon}>🔒</Text>
              <Text style={styles.menuLabel}>Update Password</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => setCurrentView('mfa-setup')} activeOpacity={0.6}>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuIcon}>🛡️</Text>
              <Text style={styles.menuLabel}>Two-Factor Authentication</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Account Info (on-demand) */}
        {showAccountInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Info</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Type</Text>
              <Text style={styles.infoValue}>{user?.role}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={[styles.infoValue, { color: user?.status === 'active' ? '#27ae60' : '#e67e22' }]}>
                {user?.status}
              </Text>
            </View>
            {user?.createdAt && (
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>
                  {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Become a Seller (customer only) */}
        {isCustomer && (
          <TouchableOpacity
            style={[styles.becomeSellerButton, isSellerRequestPending && styles.becomeSellerButtonDisabled]}
            onPress={isSellerRequestPending ? undefined : handleBecomeSeller}
            disabled={isSellerRequestPending}
            activeOpacity={isSellerRequestPending ? 1 : 0.6}
          >
            <Text style={styles.becomeSellerEmoji}>🏪</Text>
            <Text style={styles.becomeSellerText}>
              {isSellerRequestPending ? 'Seller Application Under Review' : 'Become a Seller'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.6}>
          <Text style={styles.logoutEmoji}>⏻</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { flex: 1 },

  // Avatar
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#3498db',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  userName: { fontSize: 20, fontWeight: '700', color: '#1a1a2e' },
  userEmail: { fontSize: 14, color: '#888', marginTop: 4 },

  // Menu
  menuSection: {
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 12,
    borderRadius: 14, overflow: 'hidden', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuItemDisabled: { opacity: 0.7 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { fontSize: 20, marginRight: 14 },
  menuLabel: { fontSize: 16, fontWeight: '500', color: '#333' },
  menuArrow: { fontSize: 22, color: '#ccc', fontWeight: '300' },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b7791f',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    textTransform: 'capitalize',
  },

  // Sections
  section: {
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 12,
    borderRadius: 14, padding: 16, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 14 },

  // Form
  formGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#333', backgroundColor: '#fafafa',
  },
  disabledInput: {
    borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#f0f0f0',
  },
  disabledText: { fontSize: 15, color: '#999' },
  hint: { fontSize: 11, color: '#aaa', marginTop: 4 },
  saveButton: {
    backgroundColor: '#3498db', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  changePasswordButton: {
    backgroundColor: '#1a1a2e', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  changePasswordText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },

  // Info rows
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#333', textTransform: 'capitalize' },

  // Logout
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 12,
    borderRadius: 14, paddingVertical: 16, elevation: 1,
    borderWidth: 1, borderColor: '#e74c3c20',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  logoutEmoji: { fontSize: 18, marginRight: 8, color: '#e74c3c' },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#e74c3c' },

  // Become a Seller (styled like logout but in brand accent)
  becomeSellerButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 12,
    borderRadius: 14, paddingVertical: 16, elevation: 1,
    borderWidth: 1, borderColor: '#3498db33',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  becomeSellerButtonDisabled: { opacity: 0.6 },
  becomeSellerEmoji: { fontSize: 18, marginRight: 8 },
  becomeSellerText: { fontSize: 16, fontWeight: '600', color: '#3498db' },
});
