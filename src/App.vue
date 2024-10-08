<template>
  <div>
    <TransitionRoot as="template" :show="sidebarOpen">
      <Dialog as="div" class="relative z-50 lg:hidden" @close="sidebarOpen = false">
        <TransitionChild as="template" enter="transition-opacity ease-linear duration-300" enter-from="opacity-0"
          enter-to="opacity-100" leave="transition-opacity ease-linear duration-300" leave-from="opacity-100"
          leave-to="opacity-0">
          <div class="fixed inset-0 bg-gray-900/80" />
        </TransitionChild>

        <div class="fixed inset-0 flex">
          <TransitionChild as="template" enter="transition ease-in-out duration-300 transform"
            enter-from="-translate-x-full" enter-to="translate-x-0"
            leave="transition ease-in-out duration-300 transform" leave-from="translate-x-0"
            leave-to="-translate-x-full">
            <DialogPanel class="relative mr-16 flex w-full max-w-xs flex-1">
              <TransitionChild as="template" enter="ease-in-out duration-300" enter-from="opacity-0"
                enter-to="opacity-100" leave="ease-in-out duration-300" leave-from="opacity-100" leave-to="opacity-0">
                <div class="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button type="button" class="-m-2.5 p-2.5" @click="sidebarOpen = false">
                    <span class="sr-only">Close sidebar</span>
                    <XMarkIcon class="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </div>
              </TransitionChild>

              <div class="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-2 ring-1 ring-white/10">
                <div class="flex h-16 shrink-0 items-center">
                  <img class="h-8 w-auto" src="/images/dbconvert-streams-logo.svg" alt="DBConvert Streams" />
                </div>

                <nav class="flex flex-1 flex-col">
                  <ul role="list" class="-mx-2 flex-1 space-y-1">
                    <li v-for="item in navigation" :key="item.name" :class="{ 'mt-4': item.name === 'API Key' }">
                      <RouterLink :to="item.href" :class="[
                        $route.path === item.href
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800',
                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                      ]">
                        <component :is="item.icon" class="h-6 w-6 shrink-0" aria-hidden="true" />
                        {{ item.name }}
                      </RouterLink>
                    </li>
                  </ul>
                </nav>

              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Static sidebar for desktop -->
    <div
      class="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-100 lg:block lg:w-20 lg:overflow-y-auto lg:bg-gray-900 lg:pb-10">
      <div class="flex h-16 shrink-0 items-center justify-center">
        <img class="h-8 w-auto" src="/images/dbconvert-streams-logo.svg" alt="DBConvert Streams" />
      </div>
      <nav class="mt-8">
        <ul role="list" class="flex flex-col items-center space-y-1">
          <li v-for="item in navigation" :key="item.name" :class="{ 'mt-4': item.name === 'API Key' }">
            <RouterLink :to="item.href" :class="[
              $route.path === item.href
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800',
              'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
            ]">
              <component :is="item.icon" class="h-6 w-6 shrink-0" aria-hidden="true" />
              <span class="sr-only">{{ item.name }}</span>
            </RouterLink>
          </li>
        </ul>
      </nav>
    </div>

    <div class="lg:pl-20">
      <!-- Top bar with login button -->
      <div
        class="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
        <button type="button" class="-m-2.5 p-2.5 text-gray-700 lg:hidden" @click="sidebarOpen = true">
          <span class="sr-only">Open sidebar</span>
          <Bars3Icon class="h-6 w-6" aria-hidden="true" />
        </button>

        <!-- Separator -->
        <div class="h-6 w-px bg-gray-900/10 lg:hidden" aria-hidden="true" />

        <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div class="flex items-center gap-x-4 lg:gap-x-6">
            <button type="button" class="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500">
              <span class="sr-only">View notifications</span>
              <BellIcon class="h-6 w-6" aria-hidden="true" />
            </button>

            <!-- Separator -->
            <div class="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10" aria-hidden="true" />

            <!-- Profile dropdown -->
            <Menu as="div" class="relative">
              <MenuButton class="-m-1.5 flex items-center p-1.5">
                <UserButton :showName="true" v-if="isSignedIn" :userProfileProps="{ customPages }" />
                <SignInButton v-else />
              </MenuButton>
            </Menu>
          </div>
        </div>

        <NotificationBar class="absolute inset-y-0 right-0 h-16 w-auto" />
      </div>
      <SignedIn>
        <div class="py-10 lg:py-6">
          <div class="hidden">
            <UserProfile :custom-pages="customPages" />
            <Teleport v-if="APIKeyIcon" :to="APIKeyIcon">
              <KeyIcon />
            </Teleport>
            <Teleport v-if="APIKeyPageContent" :to="APIKeyPageContent">
              <ApiKeyView />
            </Teleport>
            <Teleport v-if="UsagePageIcon" :to="UsagePageIcon">
              <ChartBarSquareIcon />
            </Teleport>
            <Teleport v-if="UsagePageContent" :to="UsagePageContent">
              <UsageView />
            </Teleport>
          </div>
          <RouterView />
        </div>
      </SignedIn>
      <SignedOut>
        <div class="flex items-center justify-center flex-col text-center pb-16">
          <SignIn />
        </div>
      </SignedOut>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, shallowRef, onMounted } from 'vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { SignInButton, UserButton, useAuth, SignedIn, SignedOut, SignIn, UserProfile } from 'vue-clerk';
import NotificationBar from '@/components/common/NotificationBar.vue';
import { useCommonStore } from '@/stores/common';
import ApiKeyView from './views/ApiKeyView.vue';
import UsageView from './views/UsageView.vue';
import type { CustomPage } from '@clerk/types';

import {
  Dialog,
  DialogPanel,
  Menu,
  MenuButton,
  TransitionChild,
  TransitionRoot
} from '@headlessui/vue';
import {
  BellIcon,
  Bars3Icon,
  ArrowPathIcon,
  HomeIcon,
  CircleStackIcon,
  XMarkIcon,
  ChartBarSquareIcon,
  KeyIcon,
  ComputerDesktopIcon,
  WalletIcon,
} from '@heroicons/vue/24/outline';

const { isSignedIn } = useAuth();
const commonStore = useCommonStore();
const router = useRouter();

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
}

const navigation = ref<NavigationItem[]>([
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Connections', href: '/connections', icon: CircleStackIcon },
  { name: 'Streams', href: '/streams', icon: ArrowPathIcon },
  { name: 'Monitor Stream', href: '/monitor', icon: ComputerDesktopIcon },
  { name: 'API Key', href: '/api-key', icon: KeyIcon },
  { name: 'Usage', href: '/usage', icon: ChartBarSquareIcon },
  { name: 'Pricing', href: '/pricing', icon: WalletIcon }
]);

const sidebarOpen = ref(false);
const APIKeyIcon = shallowRef<HTMLDivElement | null>(null);
const APIKeyPageContent = shallowRef<HTMLDivElement | null>(null);
const UsagePageIcon = shallowRef<HTMLDivElement | null>(null);
const UsagePageContent = shallowRef<HTMLDivElement | null>(null);

const initializeApp = async () => {
  try {
    const initResult = await commonStore.initApp();
    if (initResult === 'failed') {
      throw new Error('Failed to initialize app');
    }
  } catch (error) {
    console.error('Failed to initialize app:', error);
    commonStore.showNotification('Failed to initialize app. Retrying...', 'error');
    setTimeout(initializeApp, 5000); // Retry after 5 seconds
  }
};

// Watch for changes in isSignedIn and handle accordingly
watch(isSignedIn, async (newValue) => {
  if (newValue) {
    await initializeApp();
  }
});

// Call initializeApp when the component is mounted if the user is already signed in
onMounted(async () => {
  if (isSignedIn.value) {
    await initializeApp();
  }
});

// Watch for changes in route and update the current page in the common store
watch(router.currentRoute, (to) => {
  commonStore.setCurrentPage(to.name as string);
});

// Define custom pages
const customPages: CustomPage[] = [
  {
    url: '/api-key',
    label: 'API Key',
    mountIcon: (el) => {
      APIKeyIcon.value = el;
    },
    unmountIcon: () => {
      // Clean up if needed
    },
    mount: (el) => {
      APIKeyPageContent.value = el;
    },
    unmount: () => {
      // Clean up if needed
    }
  },
  {
    url: '/usage',
    label: 'Usage',
    mountIcon: (el) => {
      UsagePageIcon.value = el;
    },
    unmountIcon: () => {
      // Clean up if needed
    },
    mount: (el) => {
      UsagePageContent.value = el;
    },
    unmount: () => {
      // Clean up if needed
    }
  }
];
</script>