import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { navigateToRootSettings } from '../navigation/navigateToRootSettings';
import { navigateToNotifications } from '../navigation/navigateToNotifications';
import { EveCalTheme } from '../theme/theme';

export function TopHeader({
  onPressBell,
  onPressProfile,
  backgroundColor,
}: {
  onPressBell?: () => void;
  /** If omitted, opens root Settings screen (profile). */
  onPressProfile?: () => void;
  /** Status-bar safe area fill (e.g. match a non-default screen background). */
  backgroundColor?: string;
}) {
  const navigation = useNavigation();

  const openProfileOrSettings = () => {
    if (onPressProfile) {
      onPressProfile();
      return;
    }
    navigateToRootSettings(navigation);
  };

  const openNotifications = () => {
    if (onPressBell) {
      onPressBell();
      return;
    }
    navigateToNotifications(navigation);
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safe, backgroundColor ? { backgroundColor } : null]}>
      <View style={styles.row}>
        <View style={styles.right}>
          <Pressable
            onPress={openNotifications}
            hitSlop={10}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Notifications">
            <Feather name="bell" size={20} color={stylesVars.iconColor} />
          </Pressable>
          <Pressable
            onPress={openProfileOrSettings}
            hitSlop={10}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Settings">
            <Feather name="user" size={20} color={stylesVars.iconColor} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const stylesVars = {
  iconColor: 'rgba(142,119,110,0.75)',
};

const styles = StyleSheet.create({
  safe: {
    backgroundColor: EveCalTheme.colors.bg,
  },
  row: {
    height: 46,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBtn: {
    height: 34,
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

