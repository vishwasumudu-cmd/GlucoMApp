import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { useAuth } from "../context/AuthContext";
import { sendPasswordReset } from "../firebase/firebaseService";

export default function ForgotPasswordScreen() {
  const { activeTheme } = useAuth();
  const { colors } = activeTheme;
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    if (!email) {
      setError("Email is required");
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Email address is invalid");
      return false;
    }
    setError("");
    return true;
  };

  const handleReset = async () => {
    if (!validate()) return;

    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      await sendPasswordReset(email.trim());
      setSuccess(true);
    } catch (err) {
      console.error(err);
      let errMsg = err.message || "An error occurred. Please try again.";
      if (errMsg.includes("auth/user-not-found") || errMsg.includes("user-not-found")) {
        errMsg = "There is no user record matching this email address.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <Animated.View
          entering={FadeInUp.duration(600).springify()}
          style={styles.logoSection}
        >
          <View
            style={[styles.keyShape, { backgroundColor: colors.primary }]}
          >
            <Ionicons
              name="key"
              size={28}
              color="#FFFFFF"
              style={styles.keyIcon}
            />
          </View>
          <Text style={[styles.logoText, { color: colors.text }]}>
            Reset Password
          </Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Recover your access credentials
          </Text>
        </Animated.View>

        {/* Card Component */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(150).springify()}
        >
          <Card style={styles.formCard} title="Portal Authentication Reset">
            {success ? (
              <View
                style={[
                  styles.successBanner,
                  {
                    backgroundColor: "rgba(45,205,145,0.08)",
                    borderColor: colors.statusNormal,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color={colors.statusNormal}
                />
                <Text style={[styles.successBannerText, { color: colors.text }]}>
                  Reset link dispatched successfully. Please check your email inbox and spam folder.
                </Text>
              </View>
            ) : null}

            {error ? (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: "rgba(193,18,31,0.08)",
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.errorBannerText, { color: colors.text }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            {!success && (
              <>
                <Text style={[styles.instructions, { color: colors.textSecondary }]}>
                  Enter the email address registered to your clinical account. We will transmit a secure hyperlink to update your password.
                </Text>

                <Input
                  label="Registered E-mail Address"
                  placeholder="e.g. name@hospital.com"
                  value={email}
                  onChangeText={setEmail}
                  iconName="mail-outline"
                  keyboardType="email-address"
                />

                <Button
                  title="Send Reset Instructions"
                  onPress={handleReset}
                  loading={loading}
                  style={styles.resetButton}
                />
              </>
            )}

            <View style={styles.backToLoginRow}>
              <TouchableOpacity
                onPress={() => router.push("/login")}
                style={styles.backLink}
              >
                <Ionicons
                  name="arrow-back-outline"
                  size={16}
                  color={colors.primary}
                  style={styles.backArrow}
                />
                <Text style={{ color: colors.primary, fontWeight: "700" }}>
                  Back to Sign In
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
    paddingTop: Platform.OS === "ios" ? 70 : 40,
    justifyContent: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  keyShape: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderTopLeftRadius: 0,
    transform: [{ rotate: "45deg" }],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#C1121F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  keyIcon: {
    transform: [{ rotate: "-45deg" }],
  },
  logoText: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  formCard: {
    paddingVertical: 8,
  },
  instructions: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    marginBottom: 16,
  },
  resetButton: {
    marginTop: 14,
  },
  backToLoginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  backArrow: {
    marginRight: 6,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});
