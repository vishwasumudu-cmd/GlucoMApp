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

export default function LoginScreen() {
  const { login, activeTheme } = useAuth();
  const { colors } = activeTheme;
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");

  const validate = () => {
    let valid = true;
    let newErrors = {};

    if (!email) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email address is invalid";
      valid = false;
    }

    if (!password) {
      newErrors.password = "Password is required";
      valid = false;
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    setGeneralError("");
    try {
      const userObj = await login(email, password);
      if (userObj.role === "Patient") {
        router.replace("/patient/dashboard");
      } else if (userObj.role === "Doctor") {
        router.replace("/doctor/dashboard");
      }
    } catch (err) {
      console.error(err);
      let errMsg = err.message || "An error occurred during login.";
      if (
        errMsg.includes("auth/invalid-credential") ||
        errMsg.includes("auth/user-not-found") ||
        errMsg.includes("wrong-password")
      ) {
        errMsg = "Invalid email or password. Please try again.";
      }
      setGeneralError(errMsg);
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
        {/* Brand Header */}
        <Animated.View
          entering={FadeInUp.duration(600).springify()}
          style={styles.logoSection}
        >
          <View
            style={[styles.bloodDropShape, { backgroundColor: colors.primary }]}
          >
            <Ionicons
              name="heart"
              size={28}
              color="#FFFFFF"
              style={styles.heartIcon}
            />
          </View>
          <Text style={[styles.logoText, { color: colors.text }]}>
            GlucoMeter
          </Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Secure Clinical Telemetry Access
          </Text>
        </Animated.View>

        {/* Login Form Card */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(150).springify()}
        >
          <Card style={styles.formCard} title="Clinical Portal Login">
            {generalError ? (
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
                  {generalError}
                </Text>
              </View>
            ) : null}

            <Input
              label="E-mail Address"
              placeholder="e.g. nurse@hospital.com"
              value={email}
              onChangeText={setEmail}
              iconName="mail-outline"
              keyboardType="email-address"
              error={errors.email}
            />

            <Input
              label="Account Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              iconName="lock-closed-outline"
              secureTextEntry
              error={errors.password}
            />

            <TouchableOpacity 
              onPress={() => router.push("/forgot-password")}
              style={styles.forgotPasswordContainer}
              activeOpacity={0.7}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            <Button
              title="Secure Sign In"
              onPress={handleLogin}
              loading={loading}
              style={styles.signInButton}
            />

            <View style={styles.signUpRow}>
              <Text style={{ color: colors.textSecondary, fontWeight: "500" }}>
                Need to register?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text style={{ color: colors.primary, fontWeight: "700" }}>
                  Create Account
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
  bloodDropShape: {
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
  heartIcon: {
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
  signInButton: {
    marginTop: 14,
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginTop: 4,
    marginBottom: 12,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: "600",
  },
  signUpRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
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
});
