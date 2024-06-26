<template>
    <Modal @ok="ok">
        <template #dbtypes-combo>
            <DBTypesListBox @update:selected-db-type="selectDB" />
        </template>
        <template #connection-params>
            <ConnectionParams v-if="connection && connection.type" :connectionType="connection.type" />
        </template>
    </Modal>
</template>

<script>
import { ref, computed } from 'vue';
import api from '@/api/connections.js';
import Modal from './Modal.vue';
import ConnectionParams from './params/ConnectionParams.vue';
import DBTypesListBox from './DBTypesListBox.vue';
import { useConnectionsStore } from '@/stores/connections';
import { useCommonStore } from '@/stores/common';
import { useAuth } from 'vue-clerk';

export default {
    components: {
        Modal,
        ConnectionParams,
        DBTypesListBox,
        useAuth
    },
    setup() {
        const connectionsStore = useConnectionsStore();
        const commonStore = useCommonStore();

        const { getToken } = useAuth()
        const connection = ref(null);
        const showDBCombo = ref(false);
        const currentConnection = computed(() => connectionsStore.currentConnection);

        const selectDB = (conn) => {
            connection.value = conn;
        };

        const ok = async () => {
            commonStore.showNotificationBar = false;
            try {

                const token = await getToken.value()
                const json = JSON.stringify(currentConnection.value);
                const connectionResponse = await api.createConnection(json, token);
                const databases = await api.getDatabases(connectionResponse.id, token);
                currentConnection.value.databases = databases;

                if (currentConnection.value.type.toLowerCase() === 'postgresql') {
                    const schemas = await api.getSchemas(connectionResponse.id, token);
                    currentConnection.value.schemas = schemas;
                }

                currentConnection.value.id = connectionResponse.id;
                currentConnection.value.created = connectionResponse.created;
                // test connection is performed on backend before saving
                await connectionsStore.saveConnection(token);
                await connectionsStore.refreshConnections(token);
            } catch (err) {
                commonStore.showNotification(err.message);
            }
        };

        return {
            connection,
            showDBCombo,
            currentConnection,
            selectDB,
            ok
        };
    }
};
</script>
