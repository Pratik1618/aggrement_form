import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeTab: "dashboard",
  editingAgreement: null,
  editingAddendum: null,
  showAddendumForm: false,
  viewModal: { open: false, agreement: null },
  addendumDetailsModal: { open: false, addendum: null },
  clauseHistoryModal: { open: false, clause: null, modifications: [] },
  statusHistoryModal: { open: false, history: [], title: "" },
  showFinalUpload: null,
  dropdownOpen: {},
  isEditing: false,
  isFormDirty: false,
  currentPage: "agreement" // for DetailsModal navigation
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    setEditingAgreement: (state, action) => {
      state.editingAgreement = action.payload;
    },
    setEditingAddendum: (state, action) => {
      state.editingAddendum = action.payload;
    },
    setShowAddendumForm: (state, action) => {
      state.showAddendumForm = action.payload;
    },
    setViewModal: (state, action) => {
      state.viewModal = action.payload;
    },
    setAddendumDetailsModal: (state, action) => {
      state.addendumDetailsModal = action.payload;
    },
    setClauseHistoryModal: (state, action) => {
      state.clauseHistoryModal = action.payload;
    },
    setStatusHistoryModal: (state, action) => {
      state.statusHistoryModal = action.payload;
    },
    setShowFinalUpload: (state, action) => {
      state.showFinalUpload = action.payload;
    },
    setDropdownOpen: (state, action) => {
      state.dropdownOpen = action.payload;
    },
    setIsEditing: (state, action) => {
      state.isEditing = action.payload;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    setFormDirty: (state, action) => {
      state.isFormDirty = action.payload;
    },
    closeAllModals: (state) => {
      state.viewModal = { open: false, agreement: null };
      state.addendumDetailsModal = { open: false, addendum: null };
      state.clauseHistoryModal = { open: false, clause: null, modifications: [] };
      state.statusHistoryModal = { open: false, history: [], title: "" };
      state.showFinalUpload = null;
      state.dropdownOpen = {};
      state.showAddendumForm = false;
      state.editingAddendum = null;
    },
    resetEditingState: (state) => {
      state.editingAgreement = null;
      state.editingAddendum = null;
      state.isEditing = false;
    }
  }
});

export const {
  setActiveTab,
  setEditingAgreement,
  setEditingAddendum,
  setShowAddendumForm,
  setViewModal,
  setAddendumDetailsModal,
  setClauseHistoryModal,
  setStatusHistoryModal,
  setShowFinalUpload,
  setDropdownOpen,
  setIsEditing,
  setCurrentPage,
  setFormDirty,
  closeAllModals,
  resetEditingState
} = uiSlice.actions;

// Selectors
export const selectActiveTab = (state) => state.ui.activeTab;
export const selectEditingAgreement = (state) => state.ui.editingAgreement;
export const selectEditingAddendum = (state) => state.ui.editingAddendum;
export const selectShowAddendumForm = (state) => state.ui.showAddendumForm;
export const selectViewModal = (state) => state.ui.viewModal;
export const selectAddendumDetailsModal = (state) => state.ui.addendumDetailsModal;
export const selectClauseHistoryModal = (state) => state.ui.clauseHistoryModal;
export const selectStatusHistoryModal = (state) => state.ui.statusHistoryModal;
export const selectShowFinalUpload = (state) => state.ui.showFinalUpload;
export const selectDropdownOpen = (state) => state.ui.dropdownOpen;
export const selectIsEditing = (state) => state.ui.isEditing;
export const selectCurrentPage = (state) => state.ui.currentPage;

export default uiSlice.reducer;

