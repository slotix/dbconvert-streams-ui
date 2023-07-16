<template>
  <form @submit.prevent="handleUploadFiles">
    <div
      v-cloak
      @drop.prevent="dropFiles"
      @dragover.prevent="drag"
      class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md max-w-sm mx-auto "
      :class="{
        'border-blue-400 border-4': draggingOver
      }"
    >
      <div class="flex flex-wrap overflow-hidden">
        <div class="w-full overflow-hidden">
          <div class="space-y-1 text-center">
            <svg
              class="mx-auto h-12 w-12 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            <div class="flex-center text-gray-600">
              <label
                :for="id"
                class="relative cursor-pointer bg-white rounded-md font-medium text-blue-700 hover:text-blue-500"
              >
                <span>Select file(s) </span>
              </label>
              <input
                :id="id"
                :name="id"
                :multiple="multiple"
                :accept="accept"
                type="file"
                @change="addFiles"
                class="sr-only"
              />
            </div>
            <p class="pl-1">or drag and drop</p>
            <p class="text-xs text-gray-500">
              files up to 1GB
            </p>
          </div>
        </div>

        <div class="w-full overflow-hidden ">
          <template v-if="showFilesTable">
            <table class="table p-4 bg-white  rounded-lg table-fixed">
              <thead>
                <tr>
                  <th
                    class="w-3/4 border-b p-4 dark:border-dark-5 whitespace-nowrap font-bold text-gray"
                  >
                    File
                  </th>
                  <th
                    class="w-1/4 hidden sm:table-cell border-b p-4 dark:border-dark-5 whitespace-nowrap font-bold text-gray text-right"
                  >
                    Size
                  </th>
                  <th
                    class="w-1/4 border-b p-4 dark:border-dark-5 whitespace-nowrap font-bold text-gray"
                  ></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  class="text-gray-700 w-full"
                  v-for="file in files"
                  :key="file.id"
                >
                  <td class="border-b p-1 dark:border-dark-5 text-left space-0">
                    {{ file.name }}
                  </td>
                  <td
                    class=" hidden sm:table-cell border-b p-1 dark:border-dark-5 text-right"
                  >
                    {{ bytesToSize(file.size) }}
                  </td>
                  <td class="border-b p-1 dark:border-dark-5">
                    <button
                      @click="removeFile(file)"
                      title="Remove"
                      class="mt-2"
                      v-show="!file.uploaded"
                    >
                      <svg
                        class="mx-auto h-5 w-5 text-red-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                    <span class="mt-2" v-show="file.uploaded">
                      <svg
                        class="mx-auto h-5 w-5 text-green-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <!-- ProgressBar -->
            <div
              v-show="showProgress"
              class="w-full h-4 bg-gray-400 rounded-full mt-3"
            >
              <div
                class=" h-full text-center text-xs text-white bg-green-500 rounded-full"
                :style="{ width: progressBarValue + '%' }"
              >
                {{ progressBarValue }}
              </div>
            </div>

            <div class="items-center justify-center text-center mt-4">
              <button
                @click="upload"
                :disabled="disabledUploadBtn"
                class="relative cursor-pointer bg-white rounded-md font-medium text-blue-700 hover:text-blue-500 disabled:opacity-50"
                v-show="!filesDone"
              >
                Upload {{ filesDone }} of {{ filesToDo }} file(s)
              </button>
              <span
                class="relative bg-white rounded-md font-medium text-gray-700 "
                v-show="filesDone"
              >
                Uploaded
              </span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </form>
</template>

<script>
import axios from "axios";
export default {
  name: "UploadBox",
  props: {
    multiple: Boolean,
    accept: String,
    id: String
  },
  emits: ["changeFileName"],
  data: () => ({
    files: [],
    draggingOver: false,
    progressBarValue: 0,
    filesDone: 0,
    showProgress: false,
    disabledUploadBtn: false,
    database: "",
    for: ""
  }),
  computed: {
    showFilesTable() {
      return !(this.files.length === 0);
    },
    filesToDo() {
      return this.files.length;
    }
  },
  watch: {
    progressBarValue() {
      // if (newVal.length && newVal !== oldVal) {
      if (this.progressBarValue === 100) {
        this.disabledUploadBtn = true;
        this.$emit("changeFileName", this.files[0].name);
      } else {
        this.disabledUploadBtn = false;
      }
      //  }
    }
  },

  methods: {
    addFiles(event) {
      if (!event.target.files.length) {
        return;
      }
      this.files = [];
      this.initProgress();
      [...event.target.files].forEach(f => {
        this.files.push(f);
        f.uploaded = false;
      });
    },
    dropFiles(e) {
      this.files = [];
      this.initProgress();
      let droppedFiles = e.dataTransfer.files;
      if (!droppedFiles) return;
      // this tip, convert FileList to array, credit: https://www.smashingmagazine.com/2018/01/drag-drop-file-uploader-vanilla-js/
      [...droppedFiles].forEach(f => {
        this.files.push(f);
        f.uploaded = false;
      });
      this.draggingOver = false;
    },
    drag() {
      this.draggingOver = true;
    },
    removeFile(file) {
      this.files = this.files.filter(f => {
        return f != file;
      });
    },
    initProgress() {
      this.progressBarValue = 0;
      this.filesDone = 0;
      this.showProgress = false;
    },
    handleUploadFiles() {
      this.initProgress();
      for (const i of Object.keys(this.files)) {
        this.showProgress = true;
        this.uploadFile(this.files[i]);

        //setTimeout(() => this.uploadFile(this.files[i]), 3000);
        // setTimeout(() => this.progressDone(), 3000);
      }
    },
    uploadFile(file) {
      //handleUploadFiles() {
      const url = "http://localhost:8080/upload";
      const formData = new FormData();
      formData.append("files", file);
      //formData.append("files", this.files);

      // fetch(url, {
      //   method: "POST",
      //   body: formData
      // })
      //   .then(this.progressDone())
      //   .then((file.uploaded = true))
      //   //.then(console.log("filesDone: " + this.filesDone))
      //   //.then(console.log("progressBarValue: " + this.progressBarValue))
      //   //.then(console.log("fileUploaded: " + file.uploaded))
      //   .catch(e => {
      //     console.error(JSON.stringify(e.message));
      //   });
      const config = {
        onUploadProgress: event => {
          console.log("event", event);
          //setTimeout(() => this.progressDone(), 3000);
        }
      };
      axios
        .post(
          url,
          {
            body: formData
          },
          config
        )
        .then(this.progressDone())
        .then((file.uploaded = true))
        .catch(error => console.log(error));
    },
    progressDone() {
      this.filesDone++;
      this.progressBarValue = Math.round(
        (this.filesDone / this.filesToDo) * 100
      );
    },
    bytesToSize(x) {
      const units = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
      let l = 0,
        n = parseInt(x, 10) || 0;
      while (n >= 1024 && ++l) {
        n = n / 1024;
      }
      return n.toFixed(n < 10 && l > 0 ? 1 : 0) + units[l];
    }
  }
};
</script>

<style>
[v-cloak] {
  display: none;
}
</style>
