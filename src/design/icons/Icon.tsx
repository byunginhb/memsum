import {
  AlertCircle,
  Bell,
  Calendar,
  Camera,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Home,
  Images,
  Folder,
  Loader,
  MoreHorizontal,
  Newspaper,
  Package,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  Share2,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Truck,
  User,
  X,
} from 'lucide-react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@/design/theme/useTheme';
import type { SemanticColorName } from '@/design/tokens';

/**
 * Memsum 아이콘 시스템 — 디자인시스템.md §6
 * lucide-react-native 래퍼. 이모지 절대 금지, 모든 아이콘은 이 컴포넌트로 렌더.
 * name은 lucide kebab-case 이름. 필수 아이콘 20종 + loader(로딩 스피너용).
 */
const ICONS = {
  camera: Camera,
  images: Images,
  calendar: Calendar,
  search: Search,
  settings: Settings,
  'share-2': Share2,
  bell: Bell,
  user: User,
  home: Home,
  'file-text': FileText,
  star: Star,
  'trash-2': Trash2,
  pencil: Pencil,
  x: X,
  check: Check,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  'more-horizontal': MoreHorizontal,
  'sliders-horizontal': SlidersHorizontal,
  'refresh-cw': RefreshCw,
  'thumbs-up': ThumbsUp,
  'thumbs-down': ThumbsDown,
  plus: Plus,
  tag: Tag,
  receipt: Receipt,
  'shopping-bag': ShoppingBag,
  newspaper: Newspaper,
  folder: Folder,
  loader: Loader,
  package: Package,
  truck: Truck,
  'alert-circle': AlertCircle,
  'check-circle': CheckCircle,
  copy: Copy,
  clock: Clock,
} as const;

export type IconName = keyof typeof ICONS;

/** 아이콘 크기 토큰 — 디자인시스템.md §6: 16/20/24/32. */
export type IconSize = 16 | 20 | 24 | 32;

type IconProps = {
  name: IconName;
  /** 크기(px). 기본 20(본문 기본). */
  size?: IconSize;
  /** 의미 색 토큰 이름. 미지정 시 textPrimary. */
  color?: SemanticColorName;
};

/** 디자인시스템.md §6: stroke-width 1.75 통일. */
const STROKE_WIDTH = 1.75;

export function Icon({ name, size = 20, color = 'textPrimary' }: IconProps): ReactNode {
  const { colors } = useTheme();
  const LucideIcon = ICONS[name];
  return <LucideIcon size={size} color={colors[color]} strokeWidth={STROKE_WIDTH} />;
}
