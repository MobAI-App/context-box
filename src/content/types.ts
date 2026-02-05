import type { SelectedItem } from '../types';

export interface SelectionGroup {
  id: number;
  elements: Map<Element, SelectedItem>;
  popupEl: HTMLDivElement | null;
}

export type SelectionState = 'INACTIVE' | 'ACTIVE' | 'HOVERING';
