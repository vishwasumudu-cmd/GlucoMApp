import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Keyboard, 
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { searchPatientById } from '../../firebase/firebaseService';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';

export default function PatientSearchScreen() {
  const { activeTheme } = useAuth();
  const { colors } = activeTheme;
  const router = useRouter();

  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [patientData, setPatientData] = useState(null);

  const handleSearch = async () => {
    if (!searchId.trim()) {
      Alert.alert("Input Required", "Please enter a valid Patient ID first.");
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    setSearched(false);
    setPatientData(null);

    try {
      const cleanId = searchId.trim().toUpperCase();
      const patient = await searchPatientById(cleanId);
      
      setPatientData(patient);
      setSearched(true);
    } catch (e) {
      console.warn("Patient Search error:", e);
      Alert.alert("Search Error", "An error occurred querying the patient registry.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSearchId('');
    setPatientData(null);
    setSearched(false);
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* 1. Search Entry Panel */}
      <Card title="Registry Lookup">
        <Text style={[styles.instruction, { color: colors.textSecondary }]}>
          Enter the patient&apos;s unique clinical ID below. Patient IDs are case-insensitive and follow the format: GLU-PT-XXXXXX.
        </Text>

        <View style={styles.searchRow}>
          <Input
            placeholder="e.g. GLU-PT-123456"
            value={searchId}
            onChangeText={setSearchId}
            iconName="search-outline"
            autoCapitalize="characters"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.actionBtnRow}>
          {searched && (
            <Button
              title="Clear"
              onPress={handleClear}
              variant="secondary"
              style={styles.clearBtn}
            />
          )}
          <Button
            title="Search Database"
            onPress={handleSearch}
            loading={loading}
            style={searched ? styles.halfSearchBtn : styles.fullSearchBtn}
          />
        </View>
      </Card>

      {/* 2. Results Preview Panel */}
      {searched && (
        <View style={styles.resultsWrapper}>
          {patientData ? (
            <Card title="Patient Profile Found" style={styles.resultCard}>
              <View style={styles.profileSummary}>
                <View style={[styles.avatarTextCircle, { backgroundColor: colors.border }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {patientData.fullName.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                
                <View style={styles.metaData}>
                  <Text style={[styles.patientName, { color: colors.text }]}>
                    {patientData.fullName}
                  </Text>
                  <Text style={[styles.patientEmail, { color: colors.textSecondary }]}>
                    {patientData.email}
                  </Text>
                  
                  <View style={[styles.idChip, { backgroundColor: colors.border }]}>
                    <Text style={[styles.idChipText, { color: colors.primary }]}>
                      {patientData.uniqueId}
                    </Text>
                  </View>
                </View>
              </View>

              <Button
                title="View Telemetry Report"
                onPress={() => router.push(`/doctor/patient-details?patientId=${patientData.uniqueId}`)}
                icon={<Ionicons name="stats-chart" size={18} color="#FFFFFF" />}
                style={styles.viewReportBtn}
              />
            </Card>
          ) : (
            <Card style={styles.errorCard}>
              <View style={styles.errorState}>
                <Ionicons name="alert-circle" size={48} color={colors.statusDanger} />
                <Text style={[styles.errorTitle, { color: colors.text }]}>No Record Found</Text>
                <Text style={[styles.errorDesc, { color: colors.textSecondary }]}>
                  We could not find any active patient in the registry matching the ID &quot;{searchId.toUpperCase()}&quot;.
                </Text>
                <Text style={[styles.errorAdvice, { color: colors.textSecondary }]}>
                  Tip: Verify the ID characters, or ask the patient to present their Health ID QR code card for direct scanning.
                </Text>
              </View>
            </Card>
          )}
        </View>
      )}
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
  instruction: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  searchInput: {
    flex: 1,
    marginVertical: 0,
  },
  actionBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  clearBtn: {
    flex: 0.3,
    marginVertical: 0,
  },
  fullSearchBtn: {
    flex: 1,
    marginVertical: 0,
  },
  halfSearchBtn: {
    flex: 0.66,
    marginVertical: 0,
  },
  resultsWrapper: {
    marginTop: 16,
  },
  resultCard: {
    borderColor: '#2A9D8F',
    borderWidth: 1,
  },
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  avatarTextCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  metaData: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '800',
  },
  patientEmail: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  idChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  idChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  viewReportBtn: {
    marginVertical: 0,
  },
  errorCard: {
    borderColor: '#C1121F',
    borderWidth: 1.5,
  },
  errorState: {
    alignItems: 'center',
    padding: 10,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  errorDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
    marginTop: 8,
  },
  errorAdvice: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '500',
    marginTop: 12,
    fontStyle: 'italic',
  }
});
