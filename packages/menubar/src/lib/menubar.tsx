import { createContext, useContext, useId, useMemo, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
// Radix, not Ark: Ark UI has no menubar; the bar-level roving focus and hover-switch live here.
import * as Radix from '@radix-ui/react-menubar';
import { formatShortcut, serializeShortcut, type Shortcut, type ShortcutPlatform } from './shortcuts.js';

/*
 * A menu bar the way an IDE draws one: titles across a bar, click one and its
 * menu drops under it, hover across titles while any menu is open, keyboard all
 * the way (Left/Right across titles, Down opens, typeahead, Escape closes,
 * focus back on the title). Thin compound parts over Radix's menubar: each
 * renders the primitive with a stable `data-menubar="<part>"` hook the skin
 * targets, and passes `className` and the rest through. Nothing here knows
 * what the menus contain; the consumer composes that as children.
 *
 * Menus render in a body portal, because a bar usually sits inside something
 * that clips (a fixed-height shelf, a resizable panel). Portaled content
 * inherits from `body`, not from the bar, so the skin's contract properties
 * are read from `:root` — see menubar.css.
 */

interface MenubarSettings {
  platform: ShortcutPlatform;
  /** Where menus render; the document body by default. */
  portalContainer: HTMLElement | null | undefined;
}

const SettingsContext = createContext<MenubarSettings>({ platform: 'mac', portalContainer: undefined });

export interface MenubarProps extends Omit<ComponentPropsWithoutRef<typeof Radix.Root>, 'asChild'> {
  /** How shortcuts print beside items. */
  platform?: ShortcutPlatform;
  /** Render menus into this element instead of the body; for a themed wrapper or a story. */
  portalContainer?: HTMLElement | null;
}

/** The bar. `aria-label` it; `value`/`onValueChange` control which menu is open. */
export function Menubar({ platform = 'mac', portalContainer, loop = true, ...rest }: MenubarProps) {
  const settings = useMemo<MenubarSettings>(() => ({ platform, portalContainer }), [platform, portalContainer]);
  return (
    <SettingsContext value={settings}>
      <Radix.Root data-menubar="root" loop={loop} {...rest} />
    </SettingsContext>
  );
}

export interface MenubarMenuProps extends Omit<ComponentPropsWithoutRef<typeof Radix.Content>, 'children' | 'align'> {
  /** The title in the bar. */
  label: ReactNode;
  /** Names the menu for the bar's controlled `value`; Radix generates one otherwise. */
  value?: string;
  children: ReactNode;
}

/**
 * One title and its menu. Owns the Radix chain (Menu, Trigger, Portal,
 * Content) so a consumer never assembles it; anything else passed lands on the
 * dropdown, which is how a consumer tags it (`data-region="top"`).
 */
export function MenubarMenu({ label, value, children, ...content }: MenubarMenuProps) {
  const { portalContainer } = useContext(SettingsContext);
  return (
    <Radix.Menu value={value}>
      <Radix.Trigger data-menubar="trigger">{label}</Radix.Trigger>
      <Radix.Portal container={portalContainer ?? undefined}>
        <Radix.Content data-menubar="content" align="start" sideOffset={0} loop {...content}>
          {children}
        </Radix.Content>
      </Radix.Portal>
    </Radix.Menu>
  );
}

/** The text a menu item's typeahead matches; only a plain string label can supply it. */
function textOf(children: ReactNode): string | undefined {
  return typeof children === 'string' || typeof children === 'number' ? String(children) : undefined;
}

interface ItemBodyProps {
  children: ReactNode;
  shortcut?: Shortcut;
  /** What the indicator gutter shows when the item is checked; nothing for a plain item. */
  indicator?: ReactNode;
}

/**
 * The three columns every item has, so labels align whether or not anything
 * is checked: an indicator gutter, the label, and the shortcut. The gutter and
 * the shortcut are hidden from assistive tech; state comes from `aria-checked`
 * and the shortcut from `aria-keyshortcuts` on the item itself.
 */
function ItemBody({ children, shortcut, indicator }: ItemBodyProps) {
  const { platform } = useContext(SettingsContext);
  return (
    <>
      <span data-menubar="indicator" aria-hidden="true">
        {indicator}
      </span>
      <span data-menubar="label">{children}</span>
      {shortcut && (
        <span data-menubar="shortcut" aria-hidden="true">
          {formatShortcut(shortcut, platform)}
        </span>
      )}
    </>
  );
}

export interface MenubarItemProps extends ComponentPropsWithoutRef<typeof Radix.Item> {
  /** Shown beside the label and announced through `aria-keyshortcuts`; binding it is `useShortcuts`' job. */
  shortcut?: Shortcut;
}

/** A command. `onSelect` runs, then the menu closes. */
export function MenubarItem({ shortcut, children, textValue, ...rest }: MenubarItemProps) {
  return (
    <Radix.Item data-menubar="item" textValue={textValue ?? textOf(children)} aria-keyshortcuts={shortcut && serializeShortcut(shortcut)} {...rest}>
      <ItemBody shortcut={shortcut}>{children}</ItemBody>
    </Radix.Item>
  );
}

export interface MenubarCheckItemProps extends ComponentPropsWithoutRef<typeof Radix.CheckboxItem> {
  shortcut?: Shortcut;
}

/** A toggle. `checked` shows a mark in the gutter; `onCheckedChange` receives the next state. */
export function MenubarCheckItem({ shortcut, children, textValue, ...rest }: MenubarCheckItemProps) {
  return (
    <Radix.CheckboxItem
      data-menubar="check"
      textValue={textValue ?? textOf(children)}
      aria-keyshortcuts={shortcut && serializeShortcut(shortcut)}
      {...rest}
    >
      <ItemBody shortcut={shortcut} indicator={<Radix.ItemIndicator data-menubar="mark">✓</Radix.ItemIndicator>}>
        {children}
      </ItemBody>
    </Radix.CheckboxItem>
  );
}

export type MenubarRadioGroupProps = ComponentPropsWithoutRef<typeof Radix.RadioGroup>;

/** One-of-many. `value`/`onValueChange` name the chosen `MenubarRadioItem`. */
export function MenubarRadioGroup(props: MenubarRadioGroupProps) {
  return <Radix.RadioGroup data-menubar="radio-group" {...props} />;
}

export interface MenubarRadioItemProps extends ComponentPropsWithoutRef<typeof Radix.RadioItem> {
  shortcut?: Shortcut;
}

export function MenubarRadioItem({ shortcut, children, textValue, ...rest }: MenubarRadioItemProps) {
  return (
    <Radix.RadioItem data-menubar="radio" textValue={textValue ?? textOf(children)} aria-keyshortcuts={shortcut && serializeShortcut(shortcut)} {...rest}>
      <ItemBody shortcut={shortcut} indicator={<Radix.ItemIndicator data-menubar="mark">•</Radix.ItemIndicator>}>
        {children}
      </ItemBody>
    </Radix.RadioItem>
  );
}

export interface MenubarSubProps extends Omit<ComponentPropsWithoutRef<typeof Radix.SubContent>, 'children'> {
  /** The row in the parent menu that opens this one. */
  label: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  /** Typeahead text for the row, when `label` is not a plain string. */
  textValue?: string;
}

/**
 * A nested menu, opened from a row of its parent on hover, click, or
 * ArrowRight. Escape closes this level only and puts focus back on its row,
 * as ArrowLeft does and as the APG menubar pattern says; Radix's default
 * closes the whole bar from a submenu, so the open state is held here.
 */
export function MenubarSub({ label, children, disabled, textValue, onEscapeKeyDown, ...content }: MenubarSubProps) {
  const { portalContainer } = useContext(SettingsContext);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLDivElement>(null);
  return (
    <Radix.Sub open={open} onOpenChange={setOpen}>
      <Radix.SubTrigger ref={trigger} data-menubar="sub-trigger" disabled={disabled} textValue={textValue ?? textOf(label)}>
        <ItemBody>{label}</ItemBody>
        <span data-menubar="chevron" aria-hidden="true">
          ›
        </span>
      </Radix.SubTrigger>
      <Radix.Portal container={portalContainer ?? undefined}>
        <Radix.SubContent
          data-menubar="content"
          data-menubar-sub=""
          sideOffset={0}
          alignOffset={0}
          loop
          {...content}
          onEscapeKeyDown={(event) => {
            onEscapeKeyDown?.(event);
            if (event.defaultPrevented) return;
            event.preventDefault();
            setOpen(false);
            trigger.current?.focus();
          }}
        >
          {children}
        </Radix.SubContent>
      </Radix.Portal>
    </Radix.Sub>
  );
}

export type MenubarSeparatorProps = ComponentPropsWithoutRef<typeof Radix.Separator>;

export function MenubarSeparator(props: MenubarSeparatorProps) {
  return <Radix.Separator data-menubar="separator" {...props} />;
}

export type MenubarLabelProps = ComponentPropsWithoutRef<typeof Radix.Label>;

/**
 * A heading over a run of items; not focusable, not selectable, and no ARIA
 * role of its own (Radix renders a plain div). Give the heading to
 * `Menubar.Group` as its `label` when the group should be announced by it.
 */
export function MenubarLabel(props: MenubarLabelProps) {
  return <Radix.Label data-menubar="group-label" {...props} />;
}

export interface MenubarGroupProps extends ComponentPropsWithoutRef<typeof Radix.Group> {
  /** A heading rendered at the top of the group, which names the group for assistive tech. */
  label?: ReactNode;
}

/** Groups items for assistive tech; with `label`, the group is announced by that heading. */
export function MenubarGroup({ label, children, ...rest }: MenubarGroupProps) {
  const id = useId();
  return (
    <Radix.Group data-menubar="group" aria-labelledby={label === undefined ? undefined : id} {...rest}>
      {label !== undefined && <MenubarLabel id={id}>{label}</MenubarLabel>}
      {children}
    </Radix.Group>
  );
}

Menubar.Menu = MenubarMenu;
Menubar.Item = MenubarItem;
Menubar.CheckItem = MenubarCheckItem;
Menubar.RadioGroup = MenubarRadioGroup;
Menubar.RadioItem = MenubarRadioItem;
Menubar.Sub = MenubarSub;
Menubar.Separator = MenubarSeparator;
Menubar.Label = MenubarLabel;
Menubar.Group = MenubarGroup;
