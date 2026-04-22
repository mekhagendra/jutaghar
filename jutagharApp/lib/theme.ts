/**
 * Shared design tokens for consistent styling across the app.
 */

export const Colors = {
  // Primary palette
  primary: '#1a1a2e',
  accent: '#3498db',
  success: '#27ae60',
  danger: '#e74c3c',
  warning: '#f39c12',
  sellerAccent: '#e67e22',

  // Text
  textDark: '#1a1a2e',
  textPrimary: '#2c3e50',
  textSecondary: '#555',
  textTertiary: '#7f8c8d',
  textMuted: '#95a5a6',
  textLight: '#999',

  // Backgrounds
  background: '#f8f9fa',
  surface: '#ffffff',
  inputBg: '#fafafa',
  disabledBg: '#bdc3c7',

  // Borders
  border: '#e0e0e0',
  borderLight: '#eee',
  divider: '#f0f0f0',

  // Status badges
  status: {
    pending: { bg: '#fff3cd', text: '#856404' },
    processing: { bg: '#cce5ff', text: '#004085' },
    shipped: { bg: '#d4edda', text: '#155724' },
    delivered: { bg: '#d1ecf1', text: '#0c5460' },
    cancelled: { bg: '#f8d7da', text: '#721c24' },
    refunded: { bg: '#e2e3e5', text: '#383d41' },
  },
} as const;

export const Typography = {
  // Font sizes
  xxs: 11,
  xs: 12,
  sm: 13,
  base: 14,
  md: 15,
  lg: 16,
  xl: 18,
  xxl: 20,
  heading: 22,
  title: 26,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const Radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 14,
  full: 9999,
} as const;

/** Shared header style for standard screens (dark background with white text). */
export const HeaderStyle = {
  backgroundColor: Colors.primary,
  paddingTop: 50,
  paddingBottom: 14,
  paddingHorizontal: Spacing.lg,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
};

export const HeaderTitleStyle = {
  color: '#fff',
  fontSize: Typography.xl,
  fontWeight: '700' as const,
};

export const HeaderBackStyle = {
  color: '#fff',
  fontSize: Typography.lg,
};

/** Shared card style. */
export const CardStyle = {
  backgroundColor: Colors.surface,
  borderRadius: Radius.xxl,
  padding: Spacing.lg,
  elevation: 1,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
};

/** Shared bottom bar style. */
export const BottomBarStyle = {
  backgroundColor: Colors.surface,
  paddingHorizontal: Spacing.lg,
  paddingVertical: Spacing.md,
  borderTopWidth: 1,
  borderTopColor: Colors.borderLight,
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.08,
  shadowRadius: 3,
};

/** Shared primary button style. */
export const PrimaryButtonStyle = {
  backgroundColor: Colors.accent,
  borderRadius: Radius.lg,
  paddingVertical: 14,
  alignItems: 'center' as const,
};

export const PrimaryButtonTextStyle = {
  color: '#fff',
  fontSize: Typography.lg,
  fontWeight: '700' as const,
};

/** Standard input style. */
export const InputStyle = {
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: Radius.lg,
  paddingHorizontal: 14,
  paddingVertical: 10,
  fontSize: Typography.md,
  color: Colors.textPrimary,
  backgroundColor: Colors.inputBg,
};
