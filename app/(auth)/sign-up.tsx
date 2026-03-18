import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/hooks/useTheme';
import { Colors } from '../../src/constants/theme';
import { signUp } from '../../src/services/firebase/auth';
import { mergeDocument, COLLECTIONS } from '../../src/services/firebase/firestore';
import { getAuthErrorMessage } from '../../src/constants/authErrors';

type FormErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

function validate(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  confirmPassword: string
): FormErrors {
  const errors: FormErrors = {};
  if (!firstName.trim()) errors.firstName = 'First name is required.';
  if (!lastName.trim()) errors.lastName = 'Last name is required.';
  if (!email.trim()) {
    errors.email = 'Please enter your email.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }
  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords don't match.";
  }
  return errors;
}

export default function SignUpScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function clearFieldError(field: keyof FormErrors) {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitError(null);
  }

  async function handleSignUp() {
    const errors = validate(firstName, lastName, email.trim(), password, confirmPassword);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    setFieldErrors({});
    setSubmitError(null);

    const result = await signUp(email.trim(), password);

    if (result.error) {
      setLoading(false);
      setSubmitError(getAuthErrorMessage(result.error));
      return;
    }

    // Account created — persist name + email to profile doc before quiz writes it
    await mergeDocument(COLLECTIONS.PROFILE, 'data', {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
    });

    setLoading(false);
    // AuthGuard in _layout.tsx detects no quizCompletedAt → redirects to /(onboarding)/quiz
  }

  const googleEnabled = !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <Text style={[styles.title, { color: colors.textPrimary }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Start your PepMax journey
          </Text>

          {/* Name row */}
          <View style={styles.nameRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>First Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: fieldErrors.firstName ? Colors.error : colors.border, color: colors.textPrimary }]}
                placeholder="Jane"
                placeholderTextColor={colors.textSecondary}
                value={firstName}
                onChangeText={(t) => { setFirstName(t); clearFieldError('firstName'); }}
                autoCapitalize="words"
                autoCorrect={false}
              />
              {fieldErrors.firstName && (
                <Text style={[styles.fieldError, { color: Colors.error }]}>{fieldErrors.firstName}</Text>
              )}
            </View>

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Last Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: fieldErrors.lastName ? Colors.error : colors.border, color: colors.textPrimary }]}
                placeholder="Doe"
                placeholderTextColor={colors.textSecondary}
                value={lastName}
                onChangeText={(t) => { setLastName(t); clearFieldError('lastName'); }}
                autoCapitalize="words"
                autoCorrect={false}
              />
              {fieldErrors.lastName && (
                <Text style={[styles.fieldError, { color: Colors.error }]}>{fieldErrors.lastName}</Text>
              )}
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: fieldErrors.email ? Colors.error : colors.border, color: colors.textPrimary }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={(t) => { setEmail(t); clearFieldError('email'); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {fieldErrors.email && (
              <Text style={[styles.fieldError, { color: Colors.error }]}>{fieldErrors.email}</Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, { backgroundColor: colors.surface, borderColor: fieldErrors.password ? Colors.error : colors.border, color: colors.textPrimary }]}
                placeholder="Min. 8 characters"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={(t) => { setPassword(t); clearFieldError('password'); }}
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
            {fieldErrors.password && (
              <Text style={[styles.fieldError, { color: Colors.error }]}>{fieldErrors.password}</Text>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, { backgroundColor: colors.surface, borderColor: fieldErrors.confirmPassword ? Colors.error : colors.border, color: colors.textPrimary }]}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.textSecondary}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); clearFieldError('confirmPassword'); }}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.eyeBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => setShowConfirm((v) => !v)}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {showConfirm ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
            {fieldErrors.confirmPassword && (
              <Text style={[styles.fieldError, { color: Colors.error }]}>{fieldErrors.confirmPassword}</Text>
            )}
          </View>

          {/* Submit error (Firebase errors) */}
          {submitError && (
            <View style={[styles.errorBox, { backgroundColor: Colors.error + '18', borderColor: Colors.error + '40' }]}>
              <Text style={[styles.errorText, { color: Colors.error }]}>{submitError}</Text>
            </View>
          )}

          {/* Sign Up button */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: Colors.accent, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Sign Up</Text>
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
              {googleEnabled ? 'Sign Up with Google' : 'Google — configure client ID in .env'}
            </Text>
          </TouchableOpacity>

          {/* Apple — iOS only */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: '#000' }]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Text style={[styles.socialBtnText, { color: '#fff' }]}>Sign Up with Apple</Text>
            </TouchableOpacity>
          )}

          {/* Log in link */}
          <TouchableOpacity style={styles.linkBtn} onPress={() => router.replace('/(auth)/log-in')}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
              <Text style={{ color: Colors.accent }}>Log In</Text>
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
  nameRow: { flexDirection: 'row', gap: 12 },
  fieldGroup: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600' },
  fieldError: { fontSize: 12, marginTop: 2 },
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
