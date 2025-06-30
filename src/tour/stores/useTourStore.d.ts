import { Ref, ComputedRef } from 'vue'

export interface TourStep {
  id: string
  title: string
  content: string
  target: string
  position: string
  [key: string]: any
}

export interface TourStore {
  // State
  isActive: Ref<boolean>
  currentStep: Ref<number>
  steps: Ref<TourStep[]>
  isVisible: Ref<boolean>
  
  // Computed
  currentStepData: ComputedRef<TourStep | null>
  hasNextStep: ComputedRef<boolean>
  hasPreviousStep: ComputedRef<boolean>
  
  // Actions
  start(): void
  stop(): void
  nextStep(): void
  previousStep(): void
  goToStep(step: number): void
  setSteps(steps: TourStep[]): void
}

export declare const useTourStore: () => TourStore