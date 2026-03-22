import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { AppleMarkIcon, GoogleGIcon } from '../../components/auth/SocialBrandIcons';
import { useAuth } from '../../state/auth/AuthContext';

const BG = '#FDFBF9';
const TEXT_PRIMARY = '#4A3F35';
const TEXT_SECONDARY = '#A0978E';

const FONT_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});

export function SignInScreen() {
  const { signIn } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <View style={styles.logoWrap}>
          <View style={styles.appIconShadow}>
            <LinearGradient
              colors={['#C4B5AD', '#9A8A80', '#6E5F56']}
              locations={[0, 0.5, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.appIconGradient}>
              <Feather name="book-open" size={40} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Eve&Cal</Text>
          <Text style={styles.subtitle}>Your mental load, lightened</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.h1}>
            Sign in to save your thoughts and{'\n'}keep your path clear
          </Text>
          <Text style={styles.p}>
            You just experienced how Eve&Cal organizes your mental load. Sign in
            to save everything and access it anytime.
          </Text>

          <Pressable
            onPress={signIn}
            style={({ pressed }) => [
              styles.googleBtn,
              pressed && styles.btnPressed,
            ]}>
            <GoogleGIcon size={22} />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </Pressable>

          <Pressable
            onPress={signIn}
            style={({ pressed }) => [
              styles.appleBtn,
              pressed && styles.btnPressed,
            ]}>
            <AppleMarkIcon size={22} color="#FFFFFF" />
            <Text style={styles.appleBtnText}>Continue with Apple</Text>
          </Pressable>

          <Text style={styles.legal}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
            {" We're here to support you, not collect unnecessary data."}
          </Text>

          <Pressable onPress={signIn} style={styles.skip}>
            <Text style={styles.skipText}>Continue without signing in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 28,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 16,
  },
  appIconShadow: {
    shadowColor: 'rgba(74, 63, 53, 0.35)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 22,
  },
  appIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  title: {
    fontSize: 36,
    color: TEXT_PRIMARY,
    fontFamily: FONT_SERIF,
    letterSpacing: 0.15,
    fontWeight: '400',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: TEXT_SECONDARY,
    fontWeight: '400',
  },
  body: {
    alignItems: 'center',
    width: '100%',
  },
  h1: {
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
    color: TEXT_PRIMARY,
    fontFamily: FONT_SERIF,
    fontWeight: '400',
    letterSpacing: 0.1,
    paddingHorizontal: 4,
  },
  p: {
    marginTop: 18,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 14,
    color: TEXT_SECONDARY,
    paddingHorizontal: 6,
    marginBottom: 32,
    fontWeight: '400',
  },
  googleBtn: {
    height: 54,
    borderRadius: 999,
    width: '100%',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 63, 53, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  appleBtn: {
    height: 54,
    borderRadius: 999,
    width: '100%',
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  btnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A4A4A',
    letterSpacing: 0.1,
  },
  appleBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  legal: {
    marginTop: 22,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    color: 'rgba(74, 63, 53, 0.42)',
    paddingHorizontal: 12,
    fontWeight: '400',
  },
  skip: {
    marginTop: 22,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    textDecorationLine: 'underline',
    fontWeight: '400',
  },
});
