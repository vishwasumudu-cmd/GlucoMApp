import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function Card({ 
  children, 
  style, 
  title, 
  headerRight, 
  bordered = true, 
  noPadding = false 
}) {
  const { activeTheme } = useAuth();
  const { colors } = activeTheme;

  return (
    <View style={[
      styles.card, 
      {
        backgroundColor: colors.cardGlass,
        borderColor: colors.border,
        borderWidth: bordered ? 1 : 0,
        shadowColor: colors.shadow,
      },
      style
    ]}>
      {(title || headerRight) && (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          {title ? (
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          ) : <View />}
          {headerRight}
        </View>
      )}
      <View style={[styles.content, noPadding && styles.noPadding]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginVertical: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    padding: 16,
  },
  noPadding: {
    padding: 0,
  }
});
