export type IndicatorEffect = 'effect1' | 'effect2' | 'effect3';

export type IndicatorEffectOption = {
  value: IndicatorEffect;
  label: string;
  className: string;
};

export type IndicatorEffectSettings = {
  enabled: boolean;
  effect: IndicatorEffect;
};

export const DEFAULT_INDICATOR_EFFECT: IndicatorEffect = 'effect1';
export const DEFAULT_INDICATOR_EFFECT_SETTINGS: Readonly<IndicatorEffectSettings> = {
  enabled: true,
  effect: DEFAULT_INDICATOR_EFFECT
};

export const INDICATOR_EFFECT_OPTIONS: readonly IndicatorEffectOption[] = [
  {value: 'effect1', label: 'Effect 1', className: 'indicator-effect--1'},
  {value: 'effect2', label: 'Effect 2', className: 'indicator-effect--2'},
  {value: 'effect3', label: 'Effect 3', className: 'indicator-effect--3'}
];

export const STATIC_INDICATOR_EFFECT_CLASS = 'indicator-effect--static';
export const LAYOUT_INDICATOR_EFFECT_CLASS = 'indicator-effect indicator-effect--layout';

export function normalizeIndicatorEffect(value: unknown): IndicatorEffect {
  return value === 'effect2' || value === 'effect3' ? value : DEFAULT_INDICATOR_EFFECT;
}

export function getIndicatorEffectClass(effect: IndicatorEffect): string {
  return INDICATOR_EFFECT_OPTIONS.find((option) => option.value === effect)?.className
    ?? INDICATOR_EFFECT_OPTIONS[0].className;
}
