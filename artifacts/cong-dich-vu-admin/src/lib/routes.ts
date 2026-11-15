export const ROUTES = {
  admin: '/',
  adminImages: '/images',
  adminProfiles: '/profiles',
  signIn: '/sign-in',
  signUp: '/sign-up',
} as const;

export const publicSiteUrl = () => `${window.location.origin}/`;
