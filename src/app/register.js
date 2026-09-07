import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableOpacity 
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';

export default function RegisterScreen() {
  const { register, activeTheme } = useAuth();
  const { colors } = activeTheme;
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Patient'); // 'Patient' | 'Doctor'
  const [randomPart] = useState(() => Math.floor(100000 + Math.random() * 900000));
  const previewId = `${role === 'Patient' ? 'GLU-PT' : 'GLU-DR'}-${randomPart}`;

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const validate = () => {
    let valid = true;
    let newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
      valid = false;
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email address is invalid';
      valid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      valid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      valid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      valid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    
    setLoading(true);
    setGeneralError('');
    try {
      const userObj = await register(fullName, email, password, role);
      if (userObj.role === 'Patient') {
        router.replace('/patient/dashboard');
      } else if (userObj.role === 'Doctor') {
        router.replace('/doctor/dashboard');
      }
    } catch (err) {
      console.error(err);
      let errMsg = err.message || 'An error occurred during registration.';
      if (errMsg.includes('auth/email-already-in-use')) {
        errMsg = 'The email address is already in use by another account.';
      }
      setGeneralError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <Animated.View 
          entering={FadeInUp.duration(600).springify()}
          style={styles.logoSection}
        >
          <View style={[styles.bloodDropShape, { backgroundColor: colors.primary }]}>
            <Ionicons name="medical" size={26} color="#FFFFFF" style={styles.medicalIcon} />
          </View>
          <Text style={[styles.logoText, { color: colors.text }]}>Join GlucoMeter</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Create your account in 30 seconds
          </Text>
        </Animated.View>

        {/* Registration Card */}
        <Animated.View entering={FadeInDown.duration(600).delay(100).springify()}>
          <Card style={styles.formCard} title="Register Account">
            
            {generalError ? (
              <View style={[styles.errorBanner, { backgroundColor: 'rgba(193,18,31,0.08)', borderColor: colors.primary }]}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.errorBannerText, { color: colors.text }]}>{generalError}</Text>
              </View>
            ) : null}

            {/* Custom Role Dropdown Selector */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Select Account Role</Text>
            <View style={styles.roleSelectionRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setRole('Patient')}
                style={[
                  styles.roleButton,
                  { 
                    backgroundColor: role === 'Patient' ? colors.primary : colors.card,
                    borderColor: role === 'Patient' ? colors.primary : colors.border
                  }
                ]}
              >
                <Ionicons 
                  name="person" 
                  size={20} 
                  color={role === 'Patient' ? '#FFFFFF' : colors.textSecondary} 
                />
                <Text style={[
                  styles.roleBtnText, 
                  { color: role === 'Patient' ? '#FFFFFF' : colors.text }
                ]}>
                  Patient
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setRole('Doctor')}
                style={[
                  styles.roleButton,
                  { 
                    backgroundColor: role === 'Doctor' ? colors.primary : colors.card,
                    borderColor: role === 'Doctor' ? colors.primary : colors.border
                  }
                ]}
              >
                <Ionicons 
                  name="medical" 
                  size={20} 
                  color={role === 'Doctor' ? '#FFFFFF' : colors.textSecondary} 
                />
                <Text style={[
                  styles.roleBtnText, 
                  { color: role === 'Doctor' ? '#FFFFFF' : colors.text }
                ]}>
                  Doctor
                </Text>
              </TouchableOpacity>
            </View>

            {/* Generated ID Preview */}
            <View style={[styles.idBanner, { backgroundColor: colors.border }]}>
              <Ionicons name="finger-print-outline" size={18} color={colors.primary} />
              <Text style={[styles.idBannerText, { color: colors.text }]}>
                Auto-assigned ID:{' '}
                <Text style={{ fontWeight: '800', color: colors.primary }}>{previewId}</Text>
              </Text>
            </View>

            <Input
              label="Full Name"
              placeholder="e.g. John Doe"
              value={fullName}
              onChangeText={setFullName}
              iconName="person-outline"
              autoCapitalize="words"
              error={errors.fullName}
            />

            <Input
              label="E-mail Address"
              placeholder="e.g. john@example.com"
              value={email}
              onChangeText={setEmail}
              iconName="mail-outline"
              keyboardType="email-address"
              error={errors.email}
            />

            <Input
              label="Choose Password"
              placeholder="Minimum 6 characters"
              value={password}
              onChangeText={setPassword}
              iconName="lock-closed-outline"
              secureTextEntry
              error={errors.password}
            />

            <Input
              label="Confirm Password"
              placeholder="Retype password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              iconName="lock-open-outline"
              secureTextEntry
              error={errors.confirmPassword}
            />

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              style={styles.registerButton}
            />

            <View style={styles.loginRow}>
              <Text style={{ color: colors.textSecondary, fontWeight: '500' }}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.replace('/login')}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bloodDropShape: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderTopLeftRadius: 0,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#C1121F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  medicalIcon: {
    transform: [{ rotate: '-45deg' }],
  },
  logoText: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  formCard: {
    paddingVertical: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  roleSelectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  roleButton: {
    flex: 0.48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  idBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  idBannerText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  registerButton: {
    marginTop: 14,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  }
});
