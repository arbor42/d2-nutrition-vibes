<template>
  <component :is="activeComponent" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/stores/useUIStore'

import DashboardPanel from '@/components/panels/DashboardPanel.vue'
import TimeseriesPanel from '@/components/panels/TimeseriesPanel.vue'
import SimulationPanel from '@/components/panels/SimulationPanel.vue'
import MLPanel from '@/components/panels/MLPanel.vue'

const panelMap = {
  dashboard: DashboardPanel,
  timeseries: TimeseriesPanel,
  simulation: SimulationPanel,
  'ml-predictions': MLPanel
} as const

const uiStore = useUIStore()

const activeComponent = computed(() => {
  const key = uiStore.currentPanel || 'dashboard'
  return panelMap[key as keyof typeof panelMap] || DashboardPanel
})
</script> 