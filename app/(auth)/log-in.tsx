import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/hooks/useTheme';
import { Colors } from '../../src/constants/theme';
import { signIn, resetPassword } from '../../src/services/firebase/auth';
import { getAuthErrorMessage } from '../../src/constants/authErrors';

function validate(email: string, password: string): string | null {
  if (!email.trim()) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  if (!password) return 'Password is required.';
  return null;
}

export default function LogInScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogIn() {
    const validationError = validate(email.trim(), password);
    if (validationError) { setError(validationError); return; }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    setError(null);

    const result = await signIn(email.trim(), password);
    setLoading(false);

    if (result.error) {
      setError(getAuthErrorMessage(result.error));
    }
    // On success: AuthGuard redirects automatically
  }

  async function handleForgotPassword() {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter your email address above first.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await resetPassword(trimmed);
    if (result.error) {
      setError(getAuthErrorMessage(result.error));
    } else {
      Alert.alert('Email Sent', `Password reset instructions sent to ${trimmed}.`);
    }
  }

  const googleEnabled = !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Log in to your PepMax account
          </Text>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={(t) => { setEmail(t); setError(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={[styles.forgotText, { color: Colors.accent }]}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Your password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(null); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.eyeBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => setShowPassword((v) => !v)}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Error */}
          {error && (
            <View style={[styles.errorBox, { backgroundColor: Colors.error + '18', borderColor: Colors.error + '40' }]}>
              <Text style={[styles.errorText, { color: Colors.error }]}>{error}</Text>
            </View>
          )}

          {/* Log In button */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: Colors.accent, opacity: loading ? 0.7 : 1 }]}
            onPress={handleLogIn}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Log In</Text>
            }
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>

          {/* Google */}
          <TouchableOpacity
            style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.surface, opacity: googleEnabled ? 1 : 0.45 }]}
            disabled={!googleEnabled}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <Text style={[styles.socialBtnText, { color: colors.textPrimary }]}>
              {googleEnabled ? 'Sign In with Google' : 'Google — configure client ID in .env'}
            </Text>
          </TouchableOpacity>

          {/* Apple — iOS only */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: '#000' }]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Text style={[styles.socialBtnText, { color: '#fff' }]}>Sign In with Apple</Text>
            </TouchableOpacity>
          )}

          {/* Sign up link */}
          <TouchableOpacity style={styles.linkBtn} onPress={() => router.replace('/(auth)/sign-up')}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
              <Text style={{ color: Colors.accent }}>Sign Up</Text>
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, paddingTop: 48, gap: 16 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 15, marginBottom: 8 },
  fieldGroup: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600' },
  forgotText: { fontSize: 13 },
  input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15, flex: 1 },
  passwordRow: { flexDirection: 'row', gap: 8 },
  passwordInput: { flex: 1 },
  eyeBtn: { width: 64, height: 50, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { borderRadius: 10, borderWidth: 1, padding: 12 },
  errorText: { fontSize: 13 },
  primaryBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  socialBtn: { height: 50, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  socialBtnText: { fontSize: 15, fontWeight: '600' },
  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  linkText: { fontSize: 14 },
});
