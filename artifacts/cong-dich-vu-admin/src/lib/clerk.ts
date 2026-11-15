import { shadcn } from '@clerk/themes';

export const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

export const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: `${basePath}/`,
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#c8553d',
    colorForeground: '#1d2a2c',
    colorMutedForeground: '#5a6466',
    colorDanger: '#a3322a',
    colorBackground: '#fbf8f2',
    colorInput: '#ffffff',
    colorInputForeground: '#1d2a2c',
    colorNeutral: '#1d2a2c',
    fontFamily: "'Be Vietnam Pro', sans-serif",
    borderRadius: '0.6rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fbf8f2] rounded-2xl w-[420px] max-w-full overflow-hidden border border-[#1d2a2c]/10 shadow-[0_20px_50px_-25px_rgba(29,42,44,0.45)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#1d2a2c] font-bold',
    headerSubtitle: 'text-[#5a6466]',
    socialButtonsBlockButtonText: 'text-[#1d2a2c] font-medium',
    formFieldLabel: 'text-[#1d2a2c] font-medium',
    footerActionLink: 'text-[#c8553d] font-semibold hover:text-[#a3402c]',
    footerActionText: 'text-[#5a6466]',
    dividerText: 'text-[#5a6466]',
    identityPreviewEditButton: 'text-[#c8553d]',
    formFieldSuccessText: 'text-[#2f6b60]',
    alertText: 'text-[#7a2420]',
    logoBox: 'h-12 justify-center',
    logoImage: 'h-12 w-12',
    socialButtonsBlockButton: 'border border-[#1d2a2c]/15 bg-white hover:bg-[#f4efe6]',
    formButtonPrimary: 'bg-[#c8553d] hover:bg-[#b2462f] text-[#fbf8f2] shadow-none',
    formFieldInput: 'bg-white border-[#1d2a2c]/20 text-[#1d2a2c]',
    footerAction: 'justify-center',
    dividerLine: 'bg-[#1d2a2c]/12',
    alert: 'bg-[#f6e3de] border-[#c8553d]/30',
    otpCodeFieldInput: 'border-[#1d2a2c]/25 text-[#1d2a2c]',
    formFieldRow: 'gap-3',
    main: 'gap-5',
  },
};

export const clerkLocalization = {
  locale: 'vi-VN',
  signIn: {
    start: {
      title: 'Đăng nhập khu quản trị',
      subtitle: 'Dành cho người được cấp quyền quản lý ảnh công khai',
      actionText: 'Chưa có tài khoản?',
      actionLink: 'Đăng ký',
    },
    password: { title: 'Nhập mật khẩu', subtitle: 'Tiếp tục vào khu quản trị', actionLink: 'Dùng cách khác' },
  },
  signUp: {
    start: {
      title: 'Tạo tài khoản',
      subtitle: 'Tài khoản mới chưa có quyền quản trị cho đến khi được máy chủ phê duyệt',
      actionText: 'Đã có tài khoản?',
      actionLink: 'Đăng nhập',
    },
  },
  formFieldLabel__emailAddress: 'Địa chỉ email',
  formFieldLabel__password: 'Mật khẩu',
  formFieldInputPlaceholder__emailAddress: 'ten@vidu.vn',
  formFieldInputPlaceholder__password: 'Nhập mật khẩu',
  formButtonPrimary: 'Tiếp tục',
  dividerText: 'hoặc',
  socialButtonsBlockButton: 'Tiếp tục với {{provider|titleize}}',
};
