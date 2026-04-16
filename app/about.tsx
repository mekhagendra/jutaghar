import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Header from '../components/Header';

interface AboutUsScreenProps {
  onBack: () => void;
}

export default function AboutUsScreen({ onBack }: AboutUsScreenProps) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Header />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroSection}>
          <Text style={styles.heroEmoji}>👟</Text>
          <Text style={styles.heroTitle}>JutaGhar</Text>
          <Text style={styles.heroSubtitle}>Your Premier Footwear Destination in Nepal</Text>
        </View>

        {/* Mission */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.sectionText}>
            At JutaGhar, we believe everyone deserves access to quality footwear. Our mission is to
            connect Nepali consumers with both local and international shoe brands, providing an
            unmatched shopping experience with authentic products, competitive prices, and excellent
            customer service.
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>1000+</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>50+</Text>
            <Text style={styles.statLabel}>Brands</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>10K+</Text>
            <Text style={styles.statLabel}>Customers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>100%</Text>
            <Text style={styles.statLabel}>Authentic</Text>
          </View>
        </View>

        {/* Why Choose Us */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Choose JutaGhar?</Text>
          {[
            { icon: '✅', title: '100% Authentic Products', desc: 'Every product is verified for authenticity directly from brands and authorized sellers.' },
            { icon: '🚚', title: 'Fast & Free Delivery', desc: 'Free delivery on orders above Rs. 5,000 across Nepal with express options available.' },
            { icon: '↩️', title: 'Easy Returns', desc: '7-day hassle-free return and exchange policy for your peace of mind.' },
            { icon: '💳', title: 'Secure Payment', desc: 'Multiple secure payment options including eSewa, Khalti, and Cash on Delivery.' },
            { icon: '🏪', title: 'Multi-Vendor Marketplace', desc: 'Shop from multiple verified outlets and compare prices all in one place.' },
          ].map((item, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{item.icon}</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Story */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Story</Text>
          <Text style={styles.sectionText}>
            Founded in 2024, JutaGhar started with a simple idea — to make quality footwear
            shopping accessible and convenient for everyone in Nepal. What began as a small
            online store has grown into a thriving marketplace connecting customers with
            dozens of trusted shoe outlets across the country.
          </Text>
          <Text style={[styles.sectionText, { marginTop: 10 }]}>
            We partner with local retailers and international brands to bring you the widest
            selection of shoes — from everyday casual wear to premium athletic footwear and
            formal shoes for special occasions.
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { flex: 1 },

  heroSection: {
    alignItems: 'center', paddingVertical: 32, backgroundColor: '#1a1a2e',
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  heroSubtitle: { fontSize: 14, color: '#b0b0c8', marginTop: 4, textAlign: 'center', paddingHorizontal: 30 },

  section: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12,
    borderRadius: 14, padding: 16, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },
  sectionText: { fontSize: 14, color: '#555', lineHeight: 22 },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8,
    marginTop: 12, gap: 8, justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '48%',
    alignItems: 'center', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  statNumber: { fontSize: 24, fontWeight: '800', color: '#3498db' },
  statLabel: { fontSize: 13, color: '#888', marginTop: 4 },

  featureItem: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
  featureIcon: { fontSize: 24, marginRight: 12, marginTop: 2 },
  featureContent: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a2e', marginBottom: 3 },
  featureDesc: { fontSize: 13, color: '#666', lineHeight: 19 },
});
