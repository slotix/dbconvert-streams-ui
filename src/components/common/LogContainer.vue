<template>
    <div ref="logContainer" class="max-h-80 overflow-y-auto">
        <div v-for="log in logs" :key="log.id"
            class="flex items-center p-2 mb-2 bg-white shadow-sm rounded-md text-gray-800 font-mono">
            <div v-if="log.level === 'info'">
                <InformationCircleIcon class="mr-3 h-5 w-5 text-blue-400 group-hover:text-blue-500"
                    aria-hidden="true" />
            </div>
            <div v-else-if="log.level === 'debug'">
                <BugAntIcon class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
            </div>

            <div v-else-if="log.level === 'error'">
                <ExclamationCircleIcon class="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500" aria-hidden="true" />
            </div>

            <div v-else-if="log.level === 'warn'">
                <ExclamationTriangleIcon class="mr-3 h-5 w-5 text-yellow-400 group-hover:text-yellow-500"
                    aria-hidden="true" />
            </div>
            <span class="text-gray-500 text-sm ml-2 mr-2">
                [{{ formatTimestamp(log.ts) }}]
            </span>
            {{ log.msg }}
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

import { connect, AckPolicy, StringCodec } from 'nats.ws';
import { BugAntIcon, InformationCircleIcon, ExclamationCircleIcon, ExclamationTriangleIcon } from '@heroicons/vue/20/solid'
const logs = ref([]); // Initialize an empty array to store logs
const logContainer = ref(null);


const connectAndConsumeLogs = async () => {
  try {
    // Create a connection to a nats-server:
    const nc = await connect({ servers: 'ws://0.0.0.0:8081' });
    const js = nc.jetstream();
    const jsm = await js.jetstreamManager();

    // Create a codec
    const sc = StringCodec();
    await jsm.consumers.add('LOGS', {
      durable_name: 'logs-processor',
      ack_policy: AckPolicy.Explicit,
    });

    const c = await js.consumers.get('LOGS', 'logs-processor');

    // Consume logs
    let iter = await c.consume();
    for await (const m of iter) {
      let data = sc.decode(m.data);
      let parsed = JSON.parse(data);
      parsed.id = m.seq
      // Insert new log messages at the beginning of the array
      logs.value.push(parsed);
      m.ack();
      // Limit the number of logs to a certain threshold (e.g., 100)
      if (logs.value.length > 100) {
        logs.value.pop(); // Remove the oldest log when the threshold is reached
      }
      // if (m.info.pending === 0) {
      //   break;
      // }
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }

    // Close the connection
    await nc.drain();
  } catch (error) {
    console.log(error);
  }
};

onMounted(() => {
  connectAndConsumeLogs();
});
const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
    return date.toLocaleTimeString(); // Adjust the formatting based on your preferences
};
</script>
