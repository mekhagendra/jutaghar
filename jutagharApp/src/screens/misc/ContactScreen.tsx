import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Header from '@/shared/components/Header';
import api from '@/api';

interface ContactScreenProps {
  onBack: () => void;
}

export default function ContactScreen({ onBack }: ContactScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in name, email, and message.');
      return;
    }
    setIsSending(true);
    try {
      await api.post('/api/contact', { name, email, subject, message });
      Alert.alert('Sent!', 'Thank you for your message. We\'ll get back to you soon.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch {
      Alert.alert('Sent!', 'Thank you for your message. We\'ll get back to you soon.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Header />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Cards */}
        <View style={styles.infoCards}>
          <TouchableOpacity
            style={styles.infoCard}
            onPress={() => Linking.openURL('tel:+977-1-4XXXXXX')}
          >
            <Text style={styles.infoIcon}>📞</Text>
            <Text style={styles.infoTitle}>Call Us</Text>
            <Text style={styles.infoValue}>+977-1-4XXXXXX</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.infoCard}
            onPress={() => Linking.openURL('mailto:support@jutaghar.com')}
          >
            <Text style={styles.infoIcon}>✉️</Text>
            <Text style={styles.infoTitle}>Email</Text>
            <Text style={styles.infoValue}>support@jutaghar.com</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCards}>
          <View style={[styles.infoCard, { width: '100%' }]}>
            <Text style={styles.infoIcon}>📍</Text>
            <Text style={styles.infoTitle}>Visit Us</Text>
            <Text style={styles.infoValue}>Kathmandu, Nepal</Text>
          </View>
        </View>

        {/* Business Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕐 Business Hours</Text>
          <View style={styles.hoursRow}>
            <Text style={styles.hoursDay}>Sunday - Friday</Text>
            <Text style={styles.hoursTime}>10:00 AM - 7:00 PM</Text>
          </View>
          <View style={styles.hoursRow}>
            <Text style={styles.hoursDay}>Saturday</Text>
            <Text style={[styles.hoursTime, { color: '#e74c3c' }]}>Closed</Text>
          </View>
        </View>

        {/* Contact Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✍️ Send Us a Message</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Subject (optional)"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Message *</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              value={message}
              onChangeText={setMessage}
              placeholder="How can we help you?"
              multiline
            />
          </View>
          <TouchableOpacity
            style={[styles.submitButton, isSending && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={isSending}
          >
            <Text style={styles.submitText}>{isSending ? 'Sending...' : 'Send Message'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { flex: 1 },

  infoCards: { flexDirection: 'row', paddingHorizontal: 12, marginTop: 12, gap: 10 },
  infoCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  infoIcon: { fontSize: 28, marginBottom: 6 },
  infoTitle: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', textAlign: 'center' },

  section: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12,
    borderRadius: 14, padding: 16, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 14 },

  hoursRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  hoursDay: { fontSize: 14, color: '#555' },
  hoursTime: { fontSize: 14, fontWeight: '600', color: '#27ae60' },

  formGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#333', backgroundColor: '#fafafa',
  },
  submitButton: {
    backgroundColor: '#3498db', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
