import {
    CardStyle,
    Colors,
    InputStyle,
    PrimaryButtonStyle,
    PrimaryButtonTextStyle,
} from './theme';

export const AuthFormStyles = {
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center' as const,
    padding: 20,
    paddingBottom: 110,
  },
  logoContainer: {
    alignItems: 'center' as const,
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textTertiary,
    fontWeight: '300' as const,
  },
  formContainer: {
    ...CardStyle,
    padding: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    ...InputStyle,
    paddingVertical: 12,
  },
  primaryButton: {
    ...PrimaryButtonStyle,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  primaryButtonText: {
    ...PrimaryButtonTextStyle,
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: Colors.disabledBg,
  },
  linkText: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  mutedText: {
    color: Colors.textTertiary,
    fontSize: 16,
  },
  backButton: {
    position: 'absolute' as const,
    top: 50,
    left: 20,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 12,
  },
  backButtonText: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: Colors.textTertiary,
    fontSize: 13,
  },
};
