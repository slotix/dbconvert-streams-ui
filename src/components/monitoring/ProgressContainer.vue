<template>
  <div class="relative mt-10 mb-10">
    <div class="absolute inset-0 flex items-center" aria-hidden="true">
      <div class="w-full border-t border-gray-300"></div>
    </div>
    <div class="relative flex justify-center">
      <span class="px-3 text-xl font-semibold leading-6 text-gray-600">Progress </span>
    </div>
  </div>
  <div>
    <h4 class="sr-only">Status</h4>
    <p class="text-sm font-medium text-gray-900">Creating database structure on the target...</p>
    <div class="mt-6" aria-hidden="true">
      <div class="overflow-hidden rounded-full bg-gray-200">
        <div class="rounded-full bg-green-500 h-3" style="width: 37.5%" />
      </div>
      <div class="mt-6 hidden grid-cols-4 text-sm font-medium text-gray-600 sm:grid">
        <div class="text-gray-600">Init stream</div>
        <div class="text-center text-gray-600">Copy structure</div>
        <div class="text-center">Transfer data</div>
        <div class="text-right">Finished</div>
      </div>
    </div>
  </div>
</template>
<script setup>

</script>