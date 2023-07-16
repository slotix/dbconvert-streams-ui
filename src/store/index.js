import { createStore } from "vuex";

import connections from "./modules/connections";
import projects from "./modules/projects";
const store = createStore({
  modules: {
    connections,
    projects
  },
  state: {
    isUserMenuVisible: false
  },
  mutations: {
    SET_USERMENU_STATE: state => {
      state.isUserMenuVisible = !state.isUserMenuVisible;
    }
  },
  actions: {
    toggleUserMenu({ commit }) {
      commit("SET_USERMENU_STATE");
    }
  },
  getters: {
    userMenuState(state) {
      return state.isUserMenuVisible;
    }
  }
});

export default store;
