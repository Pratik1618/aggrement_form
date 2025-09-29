import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Helper function to format date without timezone (date only)
const formatDateWithoutTimezone = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Demo addendums data - Multiple addendums for different agreements
const demoAddendums = [
  {
    id: "ADD001",
    title: "Extension of Service Period",
    description: "Extend the service period by 6 months due to project delays",
    reason: "Client requested extension due to unforeseen project delays and additional requirements",
    impact: "Service period extended from 12 months to 18 months. No change in pricing or terms.",
    effectiveDate: formatDateWithoutTimezone(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    submittedDate: formatDateWithoutTimezone(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
    submittedBy: "checker",
    status: "Approved",
    parentAgreementId: "STATIC-001",
    parentAgreementTitle: "TechCorp Solutions",
    isDemo: true,
    uploadedFiles: {
      supportingDoc: { uploaded: true, name: "extension_request.pdf", isDemo: true },
      amendmentDoc: { uploaded: true, name: "amendment_agreement.pdf", isDemo: true }
    },
    clauseModifications: [
      {
        clauseNumber: "1",
        clauseTitle: "Term and termination (Duration)",
        modificationType: "Modified",
        details: "Duration extended from 12 months to 18 months",
        previousValue: "12 months",
        newValue: "18 months"
      }
    ],
    version: "1.0.0",
    versionHistory: [
      {
        version: "1.0.0",
        date: formatDateWithoutTimezone(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
        type: "initial",
        description: "Initial addendum submission",
        modifiedBy: "checker",
        changes: ["Service period extension"]
      }
    ]
  },
  {
    id: "ADD002",
    title: "Additional Service Requirements",
    description: "Add new service requirements for enhanced client support",
    reason: "Client requested additional support services and monitoring capabilities",
    impact: "Additional monthly cost of $2,000 for enhanced services. Improved client satisfaction.",
    effectiveDate: formatDateWithoutTimezone(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)),
    submittedDate: formatDateWithoutTimezone(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
    submittedBy: "checker",
    status: "Pending Review",
    parentAgreementId: "STATIC-002",
    parentAgreementTitle: "Global Industries",
    isDemo: true,
    uploadedFiles: {
      supportingDoc: { uploaded: true, name: "service_requirements.pdf", isDemo: true },
      amendmentDoc: { uploaded: true, name: "service_amendment.pdf", isDemo: true }
    },
    clauseModifications: [
      {
        clauseNumber: "3",
        clauseTitle: "Service Level Agreement",
        modificationType: "Modified",
        details: "Enhanced SLA with 24/7 support and monitoring",
        previousValue: "Business hours support",
        newValue: "24/7 support with monitoring"
      }
    ],
    version: "1.0.0",
    versionHistory: [
      {
        version: "1.0.0",
        date: formatDateWithoutTimezone(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
        type: "initial",
        description: "Initial addendum submission for additional services",
        modifiedBy: "checker",
        changes: ["Enhanced SLA", "24/7 support", "Monitoring services"]
      }
    ]
  },
  {
    id: "ADD003",
    title: "Budget Adjustment",
    description: "Increase project budget due to scope changes",
    reason: "Additional features requested by client",
    impact: "Budget increased by 25% to accommodate new requirements",
    effectiveDate: formatDateWithoutTimezone(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)),
    submittedDate: formatDateWithoutTimezone(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
    submittedBy: "checker",
    status: "Under Review",
    parentAgreementId: "STATIC-003",
    parentAgreementTitle: "Innovation Labs",
    isDemo: true,
    uploadedFiles: {
      supportingDoc: { uploaded: true, name: "budget_adjustment.pdf", isDemo: true }
    },
    clauseModifications: [
      {
        clauseNumber: "4",
        clauseTitle: "Payment Terms",
        modificationType: "Modified",
        details: "Payment schedule adjusted for increased budget",
        previousValue: "Monthly payments",
        newValue: "Bi-weekly payments"
      }
    ],
    version: "1.0.0",
    versionHistory: [
      {
        version: "1.0.0",
        date: formatDateWithoutTimezone(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
        type: "initial",
        description: "Initial budget adjustment request",
        modifiedBy: "checker",
        changes: ["Budget increase", "Payment schedule change"]
      }
    ]
  }
];

const initialState = {
  addendums: demoAddendums,
  loading: false,
  error: null
};

// Async thunks for future API integration
export const fetchAddendums = createAsyncThunk(
  'addendums/fetchAddendums',
  async () => {
    // Simulate API call
    return new Promise(resolve => setTimeout(() => resolve(demoAddendums), 1000));
  }
);

export const createAddendum = createAsyncThunk(
  'addendums/createAddendum',
  async (addendumData) => {
    console.log("=== CREATE ADDENDUM ASYNC THUNK ===");
    console.log("Received addendum data:", addendumData);
    
    // Simulate API call
    const newAddendum = {
      ...addendumData,
      id: `ADD${Date.now()}`,
      submittedDate: new Date().toISOString().split('T')[0],
      version: "1.0.0",
      isDemo: false
    };
    
    console.log("Created new addendum:", newAddendum);
    return newAddendum;
  }
);

export const updateAddendumStatus = createAsyncThunk(
  'addendums/updateAddendumStatus',
  async ({ addendumId, newStatus }) => {
    // Simulate API call
    return { addendumId, newStatus };
  }
);

const addendumsSlice = createSlice({
  name: 'addendums',
  initialState,
  reducers: {
                addAddendum: (state, action) => {
              console.log("=== ADDENDUM SLICE - ADD ADDENDUM ===");
              console.log("addAddendum action called with payload:", action.payload);
              console.log("Current addendums array before adding:", state.addendums);
              console.log("Payload parentAgreementId:", action.payload.parentAgreementId);
              console.log("Payload parentAgreementId type:", typeof action.payload.parentAgreementId);
              console.log("Payload title:", action.payload.title);
              console.log("Payload isDemo:", action.payload.isDemo);

              // Generate unique ID if not provided
              if (!action.payload.id) {
                action.payload.id = `ADD${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                console.log("Generated new ID:", action.payload.id);
              }

              state.addendums.push(action.payload);

              console.log("Updated addendums array after adding:", state.addendums);
              console.log("Total addendums count:", state.addendums.length);
              console.log("Last addendum in array:", state.addendums[state.addendums.length - 1]);

              // Verify the addendum was added correctly
              const addedAddendum = state.addendums.find(add => add.id === action.payload.id);
              console.log("Verification - added addendum found:", addedAddendum);
              
              // Check if addendum is in the array
              const isInArray = state.addendums.includes(action.payload);
              console.log("Is addendum in array:", isInArray);
              
              // Check by ID
              const foundById = state.addendums.find(add => add.id === action.payload.id);
              console.log("Found by ID:", foundById);
            },
    updateAddendum: (state, action) => {
      const { id, updates } = action.payload;
      const addendum = state.addendums.find(add => add.id === id);
      if (addendum) {
        Object.assign(addendum, updates);
        // Add to version history
        if (!addendum.versionHistory) addendum.versionHistory = [];
        addendum.versionHistory.push({
          version: addendum.version,
          date: new Date().toISOString(),
          type: "update",
          description: "Addendum updated",
          modifiedBy: "system",
          changes: Object.keys(updates)
        });
      }
    },
    removeAddendum: (state, action) => {
      state.addendums = state.addendums.filter(add => add.id !== action.payload);
    },
    setAddendumStatus: (state, action) => {
      const { addendumId, status } = action.payload;
      const addendum = state.addendums.find(add => add.id === addendumId);
      if (addendum) {
        addendum.status = status;
        // Add to version history
        if (!addendum.versionHistory) addendum.versionHistory = [];
        addendum.versionHistory.push({
          version: addendum.version,
          date: new Date().toISOString(),
          type: "status_change",
          description: `Status changed to ${status}`,
          modifiedBy: "system",
          changes: [`Status: ${status}`]
        });
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAddendums.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAddendums.fulfilled, (state, action) => {
        state.loading = false;
        state.addendums = action.payload;
      })
      .addCase(fetchAddendums.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createAddendum.fulfilled, (state, action) => {
        console.log("=== CREATE ADDENDUM FULFILLED ===");
        console.log("Adding addendum to store:", action.payload);
        console.log("Current addendums before adding:", state.addendums.length);
        state.addendums.push(action.payload);
        console.log("Current addendums after adding:", state.addendums.length);
        console.log("New addendum added successfully!");
      })
      .addCase(updateAddendumStatus.fulfilled, (state, action) => {
        const { addendumId, newStatus } = action.payload;
        const addendum = state.addendums.find(add => add.id === addendumId);
        if (addendum) {
          addendum.status = newStatus;
        }
      });
  }
});

export const {
  addAddendum,
  updateAddendum,
  removeAddendum,
  setAddendumStatus
} = addendumsSlice.actions;

// Selectors
export const selectAllAddendums = (state) => state.addendums.addendums;
export const selectAddendumsLoading = (state) => state.addendums.loading;
export const selectAddendumsError = (state) => state.addendums.error;
export const selectAddendumsByAgreement = (state, agreementId) => 
  state.addendums.addendums.filter(add => add.parentAgreementId === agreementId);

export default addendumsSlice.reducer;
