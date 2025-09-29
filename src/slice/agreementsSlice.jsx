import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Helper function to format date without timezone (date only)
const formatDateWithoutTimezone = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Demo agreements data - 3 sample agreements for testing
const demoAgreements = [
  {
    id: "STATIC-001",
    selectedClient: "TechCorp Solutions",
    selectedDepartment: "IT Services",
    agreementType: "LOI",
    startDate: "2024-01-15",
    endDate: "2024-12-31",
    totalValue: 50000,
    currency: "USD",
    status: "Execution Pending",
    submittedDate: formatDateWithoutTimezone(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)),
    submittedBy: "checker",
    approvalWorkflow: {
      steps: [
        {
          step: "Submitted",
          status: "completed",
          timestamp: formatDateWithoutTimezone(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)),
          user: "checker",
          userRole: "Checker",
          comments: "Agreement submitted for review"
        },
        {
          step: "Under Review",
          status: "completed",
          timestamp: formatDateWithoutTimezone(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)),
          user: "approver",
          userRole: "Approver",
          comments: "Review completed, pending execution"
        },
        {
          step: "Execution Pending",
          status: "current",
          timestamp: formatDateWithoutTimezone(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
          user: "approver",
          userRole: "Approver",
          comments: "Awaiting execution by client"
        }
      ],
      finalApproval: {
        approved: false,
        approvedBy: null,
        approvedDate: null,
        finalComments: null
      }
    },
    entityType: "single",
    priority: "Medium",
    contactInfo: {
      name: "John Smith",
      email: "john.smith@ismart.com",
      phone: "9876543210",
      clientName: "Sarah Johnson",
      clientEmail: "sarah.johnson@techcorp.com",
      clientPhone: "8765432109",
      ismartName: "John Smith",
      ismartEmail: "john.smith@ismart.com",
      ismartPhone: "9876543210"
    },
    clauses: [
      { title: "Term and termination (Duration)", placeholder: "12 months", isInitial: true },
      { title: "Payment Terms", placeholder: "15 days", isInitial: true },
      { title: "Penalty", placeholder: "500/-", isInitial: true }
    ],
    uploadStatuses: {
      LOI: { uploaded: true, file: { name: "TechCorp_LOI.pdf", size: "2.1 MB" } },
      WO: { uploaded: true, file: { name: "TechCorp_WO.pdf", size: "1.8 MB" } },
      PO: { uploaded: true, file: { name: "TechCorp_PO.pdf", size: "3.2 MB" } }
    },
    importantClauses: [
      {
        title: "Term and termination",
        description: "Agreement duration and termination conditions",
        documents: [
          { name: "Termination_Clause.pdf", size: "245 KB", type: "PDF" },
          { name: "Duration_Agreement.docx", size: "180 KB", type: "DOCX" }
        ]
      },
      {
        title: "Payment Terms",
        description: "Payment schedule and terms",
        documents: [
          { name: "Payment_Schedule.pdf", size: "320 KB", type: "PDF" }
        ]
      },
      {
        title: "SLA",
        description: "Service Level Agreement details",
        documents: [
          { name: "SLA_Document.pdf", size: "450 KB", type: "PDF" },
          { name: "Performance_Metrics.xlsx", size: "125 KB", type: "XLSX" }
        ]
      },
      {
        title: "Insurance",
        description: "Insurance coverage and requirements",
        documents: [
          { name: "Insurance_Policy.pdf", size: "1.2 MB", type: "PDF" }
        ]
      },
      {
        title: "Confidentiality",
        description: "Confidentiality and non-disclosure terms",
        documents: [
          { name: "NDA_Agreement.pdf", size: "380 KB", type: "PDF" },
          { name: "Confidentiality_Clause.docx", size: "220 KB", type: "DOCX" }
        ]
      }
    ],
    selectedBranches: [
      { name: "Mumbai Central", id: "branch-001" },
      { name: "Andheri West", id: "branch-002" }
    ],
    createdAt: "2024-01-10T10:00:00",
    lastModified: "2024-01-15T14:30:00",
    version: "1.0.0"
  },
  {
    id: "STATIC-002",
    selectedClient: "Global Industries",
    selectedDepartment: "Manufacturing",
    agreementType: "WO",
    startDate: "2024-02-01",
    endDate: "2025-01-31",
    totalValue: 75000,
    currency: "EUR",
    status: "Executed",
    submittedDate: formatDateWithoutTimezone(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)),
    submittedBy: "checker",
    approvalWorkflow: {
      steps: [
        {
          step: "Submitted",
          status: "completed",
          timestamp: formatDateWithoutTimezone(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)),
          user: "checker",
          userRole: "Checker",
          comments: "Agreement submitted for review"
        },
        {
          step: "Under Review",
          status: "completed",
          timestamp: formatDateWithoutTimezone(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)),
          user: "approver",
          userRole: "Approver",
          comments: "Review completed, approved for execution"
        },
        {
          step: "Executed",
          status: "completed",
          timestamp: formatDateWithoutTimezone(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
          user: "approver",
          userRole: "Approver",
          comments: "Agreement executed by client"
        }
      ],
      finalApproval: {
        approved: true,
        approvedBy: "approver",
        approvedDate: formatDateWithoutTimezone(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)),
        finalComments: "All terms reviewed and approved. Client has executed the agreement."
      }
    },
    entityType: "single",
    priority: "Low",
    contactInfo: {
      name: "Mike Wilson",
      email: "mike.wilson@ismart.com",
      phone: "9876543211",
      clientName: "David Brown",
      clientEmail: "david.brown@globalindustries.com",
      clientPhone: "8765432108",
      ismartName: "Mike Wilson",
      ismartEmail: "mike.wilson@ismart.com",
      ismartPhone: "9876543211"
    },
    clauses: [
      { title: "Quality Standards", placeholder: "ISO 9001", isInitial: true },
      { title: "Delivery Schedule", placeholder: "30 days", isInitial: true },
      { title: "Service Level Agreement", placeholder: "Business hours support", isInitial: true }
    ],
    uploadStatuses: {
      WO: { uploaded: true, file: { name: "GlobalIndustries_WO.pdf", size: "2.8 MB" } },
      PO: { uploaded: true, file: { name: "GlobalIndustries_PO.pdf", size: "3.1 MB" } }
    },
    importantClauses: [
      {
        title: "Quality Standards",
        description: "Quality control and standards requirements",
        documents: [
          { name: "Quality_Standards.pdf", size: "380 KB", type: "PDF" },
          { name: "ISO_Certification.pdf", size: "520 KB", type: "PDF" }
        ]
      },
      {
        title: "Delivery Schedule",
        description: "Delivery timelines and milestones",
        documents: [
          { name: "Delivery_Timeline.pdf", size: "290 KB", type: "PDF" }
        ]
      },
      {
        title: "Service Level Agreement",
        description: "Service level commitments and metrics",
        documents: [
          { name: "SLA_Agreement.pdf", size: "650 KB", type: "PDF" },
          { name: "Performance_Report.xlsx", size: "180 KB", type: "XLSX" }
        ]
      }
    ],
    selectedBranches: [
      { name: "Pune Industrial", id: "branch-003" }
    ],
    createdAt: "2024-02-01T09:00:00",
    lastModified: "2024-02-05T16:45:00",
    version: "1.0.0"
  },
  {
    id: "STATIC-003",
    selectedClient: "Healthcare Plus",
    selectedDepartment: "Medical Services",
    agreementType: "PO",
    startDate: "2024-02-15",
    endDate: "2025-02-14",
    totalValue: 120000,
    currency: "USD",
    status: "Under Process with Client",
    submittedDate: formatDateWithoutTimezone(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)),
    submittedBy: "checker",
    approvalWorkflow: {
      steps: [
        {
          step: "Submitted",
          status: "completed",
          timestamp: formatDateWithoutTimezone(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)),
          user: "checker",
          userRole: "Checker",
          comments: "Agreement submitted for review"
        },
        {
          step: "Under Review",
          status: "completed",
          timestamp: formatDateWithoutTimezone(new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)),
          user: "approver",
          userRole: "Approver",
          comments: "Review completed, approved for execution"
        },
        {
          step: "Executed",
          status: "completed",
          timestamp: formatDateWithoutTimezone(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)),
          user: "approver",
          userRole: "Approver",
          comments: "Agreement executed by client"
        },
        {
          step: "Under Process with Client",
          status: "current",
          timestamp: formatDateWithoutTimezone(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
          user: "approver",
          userRole: "Approver",
          comments: "Agreement is now being processed with client"
        }
      ],
      finalApproval: {
        approved: true,
        approvedBy: "approver",
        approvedDate: formatDateWithoutTimezone(new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)),
        finalComments: "Agreement approved and executed. Currently under process with client."
      }
    },
    entityType: "single",
    priority: "High",
    clauses: [
      { title: "Medical Standards", placeholder: "FDA Approved", isInitial: true },
      { title: "Emergency Response", placeholder: "24/7", isInitial: true },
      { title: "Quality Assurance", placeholder: "Monthly audits", isInitial: true }
    ],
    uploadStatuses: {
      PO: { uploaded: true, file: { name: "HealthcarePlus_PO.pdf", size: "4.2 MB" } }
    },
    importantClauses: [
      "Medical Standards",
      "Emergency Response",
      "Quality Assurance"
    ],
    selectedBranches: [
      { name: "Delhi Medical", id: "branch-004" },
      { name: "Bangalore Health", id: "branch-005" }
    ],
    createdAt: "2024-02-15T11:00:00",
    lastModified: "2024-02-20T15:30:00",
    version: "1.0.0"
  }
];

const initialState = {
  agreements: demoAgreements,
  loading: false,
  error: null,
  filters: {
    client: "",
    city: "",
    state: "",
    fromDate: "",
    toDate: "",
    addendumsFilter: "all"
  }
};

// Async thunks for future API integration
export const fetchAgreements = createAsyncThunk(
  'agreements/fetchAgreements',
  async () => {
    // Simulate API call
    return new Promise(resolve => setTimeout(() => resolve(demoAgreements), 1000));
  }
);

export const createAgreement = createAsyncThunk(
  'agreements/createAgreement',
  async (agreementData) => {
    // Simulate API call
    const newAgreement = {
      ...agreementData,
      id: `AGR${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      version: "1.0.0"
    };
    return newAgreement;
  }
);

export const updateAgreement = createAsyncThunk(
  'agreements/updateAgreement',
  async ({ id, updates }) => {
    // Simulate API call
    return { id, updates };
  }
);

const agreementsSlice = createSlice({
  name: 'agreements',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        client: "",
        city: "",
        state: "",
        fromDate: "",
        toDate: "",
        addendumsFilter: "all"
      };
    },
    updateAgreementStatus: (state, action) => {
      const { id, status, approvedDate, finalAgreement, priority } = action.payload;
      const agreement = state.agreements.find(ag => ag.id === id);
      if (agreement) {
        if (status !== undefined) agreement.status = status;
        if (approvedDate !== undefined) agreement.approvedDate = approvedDate;
        if (finalAgreement !== undefined) agreement.finalAgreement = finalAgreement;
        if (priority !== undefined) agreement.priority = priority;
        agreement.lastModified = new Date().toISOString();
      }
    },
    addAgreement: (state, action) => {
      state.agreements.push(action.payload);
    },
    removeAgreement: (state, action) => {
      state.agreements = state.agreements.filter(ag => ag.id !== action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAgreements.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAgreements.fulfilled, (state, action) => {
        state.loading = false;
        state.agreements = action.payload;
      })
      .addCase(fetchAgreements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createAgreement.fulfilled, (state, action) => {
        console.log("Redux: Adding new agreement to store:", action.payload);
        console.log("Redux: Upload statuses in payload:", action.payload.uploadStatuses);
        console.log("Redux: Contact info in payload:", action.payload.contactInfo);
        state.agreements.push(action.payload);
        console.log("Redux: Total agreements now:", state.agreements.length);
        console.log("Redux: Last agreement upload statuses:", state.agreements[state.agreements.length - 1].uploadStatuses);
        console.log("Redux: Last agreement contact info:", state.agreements[state.agreements.length - 1].contactInfo);
      })
      .addCase(updateAgreement.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        const agreement = state.agreements.find(ag => ag.id === id);
        if (agreement) {
          Object.assign(agreement, updates);
          agreement.lastModified = new Date().toISOString();
        }
      });
  }
});

export const {
  setFilters,
  clearFilters,
  updateAgreementStatus,
  addAgreement,
  removeAgreement
} = agreementsSlice.actions;

// Selectors
export const selectAllAgreements = (state) => state.agreements.agreements;
export const selectAgreementsLoading = (state) => state.agreements.loading;
export const selectAgreementsError = (state) => state.agreements.error;
export const selectAgreementsFilters = (state) => state.agreements.filters;

export default agreementsSlice.reducer;
