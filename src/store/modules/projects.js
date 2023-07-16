import idb from "../../api/iDBService";

export default {
  state: {
    projects: [],
    currentProject: null,
    currentStep: null,
    currentFilter: "",
    projectTypes: [
      {
        type: "conversion",
        description: "Copy Data",
        img: "@/assets/images/projects/copy-data.svg",
        imgSmall: "@/assets/images/projects/copy-data-round.svg"
      },
      {
        type: "sync",
        description: "Synchronization",
        img: "@/assets/images/projects/synchronization.svg",
        imgSmall: "@/assets/images/projects/synchronization-round.svg"
      }
    ],
    steps: [
      {
        name: "source",
        title: "Select Source database",
        description:
          "Lorem ipsum dolor sit amet consectetur adipisicing elit. Aperiam facilis, voluptates error alias dolorem praesentium sit soluta iure incidunt labore explicabo eaque, quia architecto veritatis dolores, enim consequatur nihil ipsum.",
        img: "@/assets/images/steps/source-step.svg"
      },
      {
        name: "target",
        title: "Select Target database",
        description:
          "Lorem ipsum dolor sit amet consectetur adipisicing elit. Aperiam facilis, voluptates error alias dolorem praesentium sit soluta iure incidunt labore explicabo eaque, quia architecto veritatis dolores, enim consequatur nihil ipsum.",
        img: "@/assets/images/steps/destination-step.svg"
      },
      {
        name: "settings",
        title: "Customize your Stream",
        description:
          "We are fetching the schema of your data source. This should take less than a minute, but may take a few minutes on slow internet connections or data sources with a large amount of tables.",
        img: "@/assets/images/steps/settings-step.svg"
      },
      {
        name: "run",
        title: "Run the Stream",
        description:
          "Lorem ipsum dolor sit amet consectetur adipisicing elit. Aperiam facilis, voluptates error alias dolorem praesentium sit soluta iure incidunt labore explicabo eaque, quia architecto veritatis dolores, enim consequatur nihil ipsum.",
        img: "@/assets/images/steps/launch-step.svg"
      }
    ],
    viewTypes: ["grid", "list"]
  },
  mutations: {
    SET_FILTER: (state, filter) => {
      state.currentFilter = filter;
    },
    UPDATE_PROJECTS: (state, projects) => {
      state.projects = projects;
    },
    UPDATE_CURRENT_PROJECT: (state, project) => {
      state.currentProject = project;
    },
    UPDATE_CURRENT_STEP: (state, step) => {
      state.currentStep = step;
    },
    ADD_PROJECT: (state, project) => {
      state.projects.push(project);
    },
    REMOVE_PROJECT: (state, index) => {
      state.projects.splice(index, 1);
    }
  },
  actions: {
    // async saveProject({ dispatch, state }) {
    async saveProject({ state }) {
      let project = state.currentProject;
      if (!project.id) {
        project.id = Date.now();
      }
      await idb.saveProject(JSON.parse(JSON.stringify(project)));
      // await dispatch("getProjects");
    },
    setCurrentProject(context, id) {
      let curProject = context.state.projects.filter(c => {
        return c.id === id;
      });
      context.commit("UPDATE_CURRENT_PROJECT", curProject[0]);
    },
    // async cloneCurrentProject({ dispatch, state }) {
    async cloneCurrentProject({ context }) {
      // debugger;
      if (!context.state.currentProject) {
        throw new Error("can't clone empty project");
      }
      let clonedProject = context.state.currentProject;
      clonedProject.id = Date.now();
      // dispatch("setCurrentProject", clonedProject.id);
      context.dispatch("setCurrentProject", clonedProject.id);
      await context.dispatch("saveProject");
    },

    async refreshProjects(context) {
      // context.state.getProjects = [];
      let projects = await idb.getProjects();
      context.commit("UPDATE_PROJECTS", projects);
    },
    // async deleteProject({ commit, dispatch }, index) {
    async deleteProject({ commit }, index) {
      commit("REMOVE_PROJECT", index);
      await idb.deleteProject(index);
      // await dispatch("getProjects");
    }
  },
  getters: {
    allProjects(state) {
      return state.projects;
    },
    allProjectsNewestFirst(state) {
      return state.projects.reverse();
    },
    projectsByType(state) {
      return state.projects
        .filter(function(el) {
          return (
            el.type.toLowerCase().indexOf(state.currentFilter.toLowerCase()) >
            -1
          );
        })
        .reverse();
    },
    currentProject(state) {
      return state.currentProject;
    },
    currentStep(state) {
      return state.currentStep;
    },
    allSteps(state) {
      return state.steps;
    },
    projectTypes(state) {
      return state.projectTypes;
    }
  }
};
