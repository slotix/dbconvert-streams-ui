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
import api from '@/api/connections';
import Modal from './Modal.vue';
import ConnectionParams from './params/ConnectionParams.vue';
import DBTypesListBox from './DBTypesListBox.vue';
import { useConnectionsStore } from '@/stores/connections';
import { useCommonStore } from '@/stores/common';

export default {
    components: {
        Modal,
        ConnectionParams,
        DBTypesListBox,
        // useAuth
    },
    setup() {
        const connectionsStore = useConnectionsStore();
        const commonStore = useCommonStore();

        const connection = ref(null);
        const showDBCombo = ref(false);
        const currentConnection = computed(() => connectionsStore.currentConnection);

        const selectDB = (conn) => {
            connection.value = conn;
        };

        const ok = async () => {
            commonStore.showNotificationBar = false;
            try {
                const json = JSON.stringify(currentConnection.value);
                const connectionResponse = await api.createConnection(json);
                const databases = await api.getDatabases(connectionResponse.id);
                currentConnection.value.databases = databases;

                if (currentConnection.value.type.toLowerCase() === 'postgresql') {
                    const schemas = await api.getSchemas(connectionResponse.id);
                    currentConnection.value.schemas = schemas;
                }

                currentConnection.value.id = connectionResponse.id;
                currentConnection.value.created = connectionResponse.created;
                // test connection is performed on backend before saving
                await connectionsStore.saveConnection();
                await connectionsStore.refreshConnections();
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
