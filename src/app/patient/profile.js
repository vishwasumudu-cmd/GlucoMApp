import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Share 
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { formatDateString } from '../../utils/helpers';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function ProfileScreen() {
  const { user, activeTheme } = useAuth();
  const { colors } = activeTheme;

  if (!user) return null;

  // Render QR Code using a robust public API (requires no heavy native node modules)
  // Generates vector QR matching unique Patient ID
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=${colors.primary.substring(1)}&data=${user.uniqueId}`;

  const shareProfileId = async () => {
    try {
      await Share.share({
        message: `GlucoMeter Patient Credentials:\nName: ${user.fullName}\nID: ${user.uniqueId}\nEmail: ${user.email}`,
      });
    } catch (error) {
      console.warn("Share failed:", error);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Clinical Health ID Badge Card */}
      <Card style={styles.badgeCard} noPadding>
        {/* Card Header styling - Primary Red Accent */}
        <View style={[styles.badgeHeader, { backgroundColor: colors.primary }]}>
          <View style={styles.badgeHeaderRow}>
            <View style={styles.badgeBrand}>
              <Ionicons name="medical" size={18} color="#FFFFFF" />
              <Text style={styles.badgeBrandText}>GLUCOMETER CLINICAL ID</Text>
            </View>
            <Text style={styles.badgeStatusText}>ACTIVE</Text>
          </View>
        </View>

        <View style={styles.badgeBody}>
          <View style={styles.badgeMeta}>
            <View style={styles.badgeAvatarPlaceholder}>
              <Ionicons name="person" size={44} color={colors.textSecondary} />
            </View>
            <View style={styles.badgeDetailCol}>
              <Text style={[styles.badgeName, { color: colors.text }]}>{user.fullName}</Text>
              <Text style={[styles.badgeSub, { color: colors.textSecondary }]}>{user.email}</Text>
              
              <View style={styles.idChip}>
                <Text style={[styles.idChipText, { color: colors.primary }]}>{user.uniqueId}</Text>
              </View>
            </View>
          </View>

          {/* QR Code Container */}
          <View style={[styles.qrBorder, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Image 
              source={{ uri: qrCodeUrl }}
              style={styles.qrImage}
              contentFit="contain"
            />
          </View>

          <Text style={[styles.qrHelpText, { color: colors.textSecondary }]}>
            Present this clinical QR code to your doctor to sync and load your blood glucose logs instantly.
          </Text>
        </View>
      </Card>

      {/* 2. Metadata details card */}
      <Card title="Card Registry Details">
        <View style={styles.regRow}>
          <View style={styles.regLeft}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            <Text style={[styles.regLabel, { color: colors.text }]}>Identity Authority</Text>
          </View>
          <Text style={[styles.regVal, { color: colors.textSecondary }]}>Local Sandbox Auth</Text>
        </View>
        <View style={[styles.regDivider, { backgroundColor: colors.border }]} />

        <View style={styles.regRow}>
          <View style={styles.regLeft}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={[styles.regLabel, { color: colors.text }]}>Registered Date</Text>
          </View>
          <Text style={[styles.regVal, { color: colors.textSecondary }]}>
            {user.createdAt ? formatDateString(user.createdAt) : formatDateString(new Date())}
          </Text>
        </View>
        <View style={[styles.regDivider, { backgroundColor: colors.border }]} />

        <View style={styles.regRow}>
          <View style={styles.regLeft}>
            <Ionicons name="people-outline" size={20} color={colors.primary} />
            <Text style={[styles.regLabel, { color: colors.text }]}>User Access Profile</Text>
          </View>
          <Text style={[styles.regVal, { color: colors.textSecondary }]}>{user.role}</Text>
        </View>
      </Card>

      <Button
        title="Share Health Profile"
        onPress={shareProfileId}
        variant="outline"
        icon={<Ionicons name="share-social-outline" size={20} color={colors.primary} />}
        style={styles.shareBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  badgeCard: {
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  badgeHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  badgeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeBrandText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    marginLeft: 6,
    letterSpacing: 0.8,
  },
  badgeStatusText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeBody: {
    padding: 20,
    alignItems: 'center',
  },
  badgeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  badgeAvatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(100, 100, 100, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  badgeDetailCol: {
    flex: 1,
  },
  badgeName: {
    fontSize: 18,
    fontWeight: '800',
  },
  badgeSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  idChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(193, 18, 31, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  idChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  qrBorder: {
    padding: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    marginVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  qrImage: {
    width: 160,
    height: 160,
  },
  qrHelpText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  regRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  regLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  regLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 10,
  },
  regVal: {
    fontSize: 13,
    fontWeight: '500',
  },
  regDivider: {
    height: 1,
  },
  shareBtn: {
    marginTop: 8,
  }
});
