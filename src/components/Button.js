import React from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  View 
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function Button({ 
  onPress, 
  title, 
  loading = false, 
  disabled = false, 
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger'
  style, 
  textStyle,
  icon
}) {
  const { activeTheme } = useAuth();
  const { colors } = activeTheme;

  // Determine button styles based on variants
  let buttonBg = colors.primary;
  let borderColor = 'transparent';
  let textColor = '#FFFFFF';

  if (variant === 'secondary') {
    buttonBg = colors.card;
    borderColor = colors.border;
    textColor = colors.text;
  } else if (variant === 'outline') {
    buttonBg = 'transparent';
    borderColor = colors.primary;
    textColor = colors.primary;
  } else if (variant === 'danger') {
    buttonBg = colors.statusDanger;
    textColor = '#FFFFFF';
  }

  const isBtnDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isBtnDisabled}
      style={[
        styles.button,
        {
          backgroundColor: buttonBg,
          borderColor: borderColor,
          borderWidth: variant === 'outline' || variant === 'secondary' ? 1.5 : 0,
          opacity: isBtnDisabled ? 0.6 : 1,
          shadowColor: variant === 'primary' ? colors.primary : colors.shadow,
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' || variant === 'secondary' ? colors.text : '#FFFFFF'} />
      ) : (
        <View style={styles.contentContainer}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[
            styles.text, 
            { color: textColor },
            textStyle
          ]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
