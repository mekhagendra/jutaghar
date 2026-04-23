import type { User } from '@/types';

export interface AccountAction {
  label: string;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
}

interface GetAccountActionsInput {
  isAuthenticated: boolean;
  user: User | null;
  logout: () => void;
  isHomePage?: boolean;
}

export const getAccountActions = ({
  isAuthenticated,
  user,
  logout,
  isHomePage = false,
}: GetAccountActionsInput): AccountAction[] => {
  if (!isAuthenticated || !user) {
    return [{ label: 'Login', to: '/login' }];
  }

  const dashboardLink = (): AccountAction | null => {
    if (user.role === 'customer') {
      return isHomePage ? { label: 'My Dashboard', to: '/user/dashboard' } : null;
    }
    if (user.role === 'admin') return { label: 'My Dashboard', to: '/admin/dashboard' };
    if (user.role === 'seller') return { label: 'My Dashboard', to: '/seller/dashboard' };
    if (user.role === 'manager') return { label: 'My Dashboard', to: '/manager/dashboard' };
    return null;
  };

  const dashboardAction = dashboardLink();

  const commonActions: AccountAction[] = [
    ...(dashboardAction ? [dashboardAction] : []),
    { label: 'My Account', to: '/user/account' },
    { label: 'Update Profile', to: '/user/profile/update' },
    { label: 'Update Password', to: '/user/profile/change-password' },
    { label: 'Two Factor Authentication', to: '/user/mfa' },
  ];

  const roleActions: AccountAction[] = [];

  if (
    user.role === 'customer' &&
    (!user.vendorRequest ||
      user.vendorRequest.status === 'none' ||
      user.vendorRequest.status === 'rejected')
  ) {
    roleActions.push({ label: 'Become a Seller', to: '/user/profile#become-seller' });
  }

  return [
    ...commonActions,
    ...(user.role === 'customer' && roleActions.length > 0 ? [roleActions[0]] : []),
    { label: 'Logout', onClick: logout, danger: true },
  ];
};
