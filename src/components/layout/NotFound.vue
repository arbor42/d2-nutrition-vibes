<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
    <div class="max-w-lg text-center">
      <h1 class="text-8xl font-bold text-primary-500 mb-4">404</h1>
      <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Seite nicht gefunden
      </h2>
      <p class="text-gray-600 dark:text-gray-400 mb-8">
        Die angeforderte Seite konnte nicht gefunden werden.
      </p>
      <router-link
        to="/"
        class="inline-flex items-center px-6 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
      >
        Zurück zur Startseite
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
// 404 Not Found page component
</script>