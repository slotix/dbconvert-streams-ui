import { computed, type ComputedRef } from 'vue'
import {
  ICON_SIZES,
  ICON_SPACING,
  getIconSize,
  getIconClasses,
  type IconSizeKey,
  type IconSize,
  type IconSpacingKey,
  type IconSpacing
} from '@/constants'

/**
 * Composable for working with standardized icon sizes.
 * Provides reactive computed properties for icon CSS classes.
 *
 * @example
 * ```vue
 * <script setup>
 * const { iconClass } = useIconSizes('MD')
 * </script>
 * <template>
 *   <ChevronRightIcon :class="iconClass" />
 * </template>
 * ```
 *
 * @example With spacing
 * ```vue
 * <script setup>
 * const { iconWithTextClass } = useIconSizes('BASE', 'DEFAULT')
 * </script>
 * <template>
 *   <PlusIcon :class="iconWithTextClass" />
 *   <span>Add Item</span>
 * </template>
 * ```
 */
export function useIconSizes(
  size: IconSizeKey | IconSize = 'BASE',
  spacing?: IconSpacingKey | IconSpacing
) {
  /**
   * Computed icon size class (e.g., 'h-4 w-4')
   */
  const iconClass: ComputedRef<string> = computed(() => {
    return typeof size === 'string' && size in ICON_SIZES
      ? ICON_SIZES[size as IconSizeKey]
      : (size as IconSize)
  })

  /**
   * Computed icon class with spacing (e.g., 'h-4 w-4 mr-2')
   * Use this when the icon appears next to text
   */
  const iconWithTextClass: ComputedRef<string> = computed(() => {
    if (!spacing) return iconClass.value

    const spacingClass =
      typeof spacing === 'string' && spacing in ICON_SPACING
        ? ICON_SPACING[spacing as IconSpacingKey]
        : (spacing as IconSpacing)

    return spacingClass ? `${iconClass.value} ${spacingClass}` : iconClass.value
  })

  /**
   * Get icon classes for a specific size (utility function)
   */
  function getIconClassForSize(sizeKey: IconSizeKey): string {
    return ICON_SIZES[sizeKey]
  }

  /**
   * Get icon classes with spacing for a specific size (utility function)
   */
  function getIconClassWithSpacing(
    sizeKey: IconSizeKey | IconSize,
    spacingKey: IconSpacingKey | IconSpacing = 'DEFAULT'
  ): string {
    return getIconClasses(sizeKey, spacingKey)
  }

  return {
    iconClass,
    iconWithTextClass,
    getIconClassForSize,
    getIconClassWithSpacing
  }
}

/**
 * Composable that returns all standard icon sizes.
 * Useful when you need multiple icon sizes in the same component.
 *
 * @example
 * ```vue
 * <script setup>
 * const sizes = useAllIconSizes()
 * </script>
 * <template>
 *   <SpinnerIcon :class="sizes.xs" /> <!-- Small spinner -->
 *   <TrashIcon :class="sizes.base" />  <!-- Normal icon -->
 *   <MenuIcon :class="sizes.lg" />     <!-- Large icon -->
 * </template>
 * ```
 */
export function useAllIconSizes() {
  return {
    xs: ICON_SIZES.XS,
    sm: ICON_SIZES.SM,
    base: ICON_SIZES.BASE,
    md: ICON_SIZES.MD,
    lg: ICON_SIZES.LG,
    xl: ICON_SIZES.XL,
    xxl: ICON_SIZES.XXL,
    xxxl: ICON_SIZES.XXXL
  }
}

/**
 * Helper composable for context-specific icon sizes.
 * Returns recommended icon sizes for different UI contexts.
 *
 * @example
 * ```vue
 * <script setup>
 * const { tableAction, primaryButton, sidebarMenu } = useContextualIconSizes()
 * </script>
 * <template>
 *   <button><PlusIcon :class="primaryButton" /> Create</button>
 *   <nav><HomeIcon :class="sidebarMenu" /> Home</nav>
 *   <table>
 *     <td><SortIcon :class="tableAction" /></td>
 *   </table>
 * </template>
 * ```
 */
export function useContextualIconSizes() {
  return {
    /** Icon size for table action buttons (h-4 w-4) */
    tableAction: ICON_SIZES.BASE,
    /** Icon size for form inputs (h-4 w-4) */
    formInput: ICON_SIZES.BASE,
    /** Icon size for context menu items (h-4 w-4) */
    contextMenu: ICON_SIZES.BASE,
    /** Icon size for primary action buttons (h-5 w-5) */
    primaryButton: ICON_SIZES.MD,
    /** Icon size for navigation headers (h-5 w-5) */
    navigationHeader: ICON_SIZES.MD,
    /** Icon size for modal close buttons (h-5 w-5) */
    modalClose: ICON_SIZES.MD,
    /** Icon size for sidebar menu items (h-6 w-6) */
    sidebarMenu: ICON_SIZES.LG,
    /** Icon size for small spinners (h-3 w-3) */
    spinnerSmall: ICON_SIZES.XS,
    /** Icon size for default spinners (h-4 w-4) */
    spinner: ICON_SIZES.BASE,
    /** Icon size for large spinners (h-8 w-8) */
    spinnerLarge: ICON_SIZES.XL,
    /** Icon size for empty state placeholders (h-12 w-12) */
    emptyState: ICON_SIZES.XXL,
    /** Icon size for hero sections (h-16 w-16) */
    hero: ICON_SIZES.XXXL
  }
}
