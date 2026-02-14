import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setEditingAgreement, setActiveTab } from '../slice/uiSlice';
import { createAgreement, updateAgreement } from '../slice/agreementsSlice';
import { useAppState } from '../hooks/useRedux';

const AgreementForm = () => {
  const dispatch = useDispatch();
  const { user } = useAppState();
  
  // Safe selector with fallback
  const editingAgreement = useSelector(state => {
    try {
      return state?.ui?.editingAgreement || null;
    } catch (error) {
      console.error("Error accessing Redux state:", error);
      return null;
    }
  });
  
  const isEditing = !!editingAgreement;

  // console.log("AgreementForm rendering - isEditing:", isEditing, "editingAgreement:", editingAgreement);
  

  // Helper function to safely access nested properties
  const safeGet = (obj, path, defaultValue = '') => {
    const result = path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : defaultValue;
    }, obj);
    // Ensure we always return a string to prevent object rendering issues
    return typeof result === 'string' ? result : String(result || defaultValue);
  };

  // Form state
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isFormReady, setIsFormReady] = useState(false);
  
  // Initialize formData with safe defaults
  const [formData, setFormData] = useState({
    selectedClient: '',
    selectedDepartment: '',
    selectedBranches: [],
    agreementType: '',
    startDate: '',
    endDate: '',
    openAgreement: false,
    remarks: '',
    entityType: 'single',
    groupCompanies: [''],
    isRenewal: false,
    originalAgreementId: '',
    importantClauses: [
      { title: 'Term and termination (Duration)', content: '', file: null },
      { title: 'Payment Terms', content: '', file: null },
      { title: 'Penalty', content: '', file: null },
      { title: 'Minimum Wages', content: '', file: null },
      { title: 'Costing - Salary Breakup', content: '', file: null },
      { title: 'SLA', content: '', file: null },
      { title: 'Indemnity', content: '', file: null },
      { title: 'Insurance', content: '', file: null }
    ],
    contactInfo: {
      name: '',
      email: '',
      phone: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      ismartName: '',
      ismartEmail: '',
      ismartPhone: ''
    },
    uploadStatuses: {
      LOI: { uploaded: false, file: null },
      WO: { uploaded: false, file: null },
      PO: { uploaded: false, file: null },
      EmailApproval: { uploaded: false, file: null }
    },
    clientDraftFile: { uploaded: false, file: null },
    draftFiles: []
  });

  // Safety check - don't render if formData is not properly initialized
  if (!formData) {
    console.log("formData is not initialized, returning null");
    return null;
  }

  // Demo data
  const clientOptions = [
    'Tech Solutions',
    'ABC Corp',
    'XYZ Ltd',
    'Global Industries',
    'Innovation Labs'
  ];

  const branchOptions = [
    'Pan India',
    'Mumbai',
    'Delhi',
    'Bangalore',
    'Pune',
    'Chennai',
    'Hyderabad',
    'Kolkata'
  ];

  const agreementTypeOptions = ['Client Draft', 'iSmart Draft'];

  // Load editing data
  useEffect(() => {
    if (isEditing && editingAgreement) {
      try {
        // Safety check: ensure editingAgreement is a valid object
        if (typeof editingAgreement !== 'object' || editingAgreement === null) {
          console.error("Invalid editingAgreement:", editingAgreement);
          return;
        }
        
        // Check if we already have the same data to prevent infinite loops
        if (formData.selectedClient === editingAgreement.selectedClient && 
            formData.agreementType === editingAgreement.agreementType) {
          return;
        }
      
      // Ensure all required objects exist with default values
      const safeEditingData = {
        ...editingAgreement,
        contactInfo: editingAgreement.contactInfo || {
          name: '',
          email: '',
          phone: '',
          clientName: '',
          clientEmail: '',
          clientPhone: '',
          ismartName: '',
          ismartEmail: '',
          ismartPhone: ''
        },
        importantClauses: editingAgreement.importantClauses || [
          { title: 'Term and termination (Duration)', content: '', file: null },
          { title: 'Payment Terms', content: '', file: null },
          { title: 'Penalty', content: '', file: null },
          { title: 'Minimum Wages', content: '', file: null },
          { title: 'Costing - Salary Breakup', content: '', file: null },
          { title: 'SLA', content: '', file: null },
          { title: 'Indemnity', content: '', file: null },
          { title: 'Insurance', content: '', file: null }
        ],
        selectedBranches: editingAgreement.selectedBranches || [],
          groupCompanies: editingAgreement.groupCompanies || [''],
          uploadStatuses: editingAgreement.uploadStatuses || {
            LOI: { uploaded: false, file: null },
            WO: { uploaded: false, file: null },
            PO: { uploaded: false, file: null },
            EmailApproval: { uploaded: false, file: null }
          },
          clientDraftFile: editingAgreement.clientDraftFile || { uploaded: false, file: null }
      };
      
      setFormData(safeEditingData);
        setIsFormReady(true);
      } catch (error) {
        console.error("Error in AgreementForm useEffect:", error);
        console.error("Error details:", error.message, error.stack);
        // Reset to default form data if there's an error
        setFormData({
          selectedClient: '',
          selectedDepartment: '',
          selectedBranches: [],
          agreementType: '',
          startDate: '',
          endDate: '',
          openAgreement: false,
          remarks: '',
          entityType: 'single',
          groupCompanies: [''],
          importantClauses: [
            { title: 'Term and termination (Duration)', content: '', file: null },
            { title: 'Payment Terms', content: '', file: null },
            { title: 'Penalty', content: '', file: null },
            { title: 'Minimum Wages', content: '', file: null },
            { title: 'Costing - Salary Breakup', content: '', file: null },
            { title: 'SLA', content: '', file: null },
            { title: 'Indemnity', content: '', file: null },
            { title: 'Insurance', content: '', file: null }
          ],
          contactInfo: {
            name: '',
            email: '',
            phone: '',
            clientName: '',
            clientEmail: '',
            clientPhone: '',
            ismartName: '',
            ismartEmail: '',
            ismartPhone: ''
          },
          uploadStatuses: {
            LOI: { uploaded: false, file: null },
            WO: { uploaded: false, file: null },
            PO: { uploaded: false, file: null },
            EmailApproval: { uploaded: false, file: null }
          },
          clientDraftFile: { uploaded: false, file: null }
        });
        setIsFormReady(true);
      }
    } else if (!isEditing) {
      // If not editing, set form ready immediately
      setIsFormReady(true);
    }
  }, [isEditing, editingAgreement?.id]); // Only depend on the ID, not the entire object

  // Load draft files from localStorage - always load them
  useEffect(() => {
    const loadDraftFiles = () => {
      const draftFiles = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('draft_')) {
          try {
            const draftData = JSON.parse(localStorage.getItem(key));
            // Only include drafts that are truly drafts (not submitted agreements)
            // Check if it's actually a draft and not a submitted agreement
            if (draftData.status === 'draft' || (!draftData.status && !draftData.submittedDate)) {
            draftFiles.push({
              id: key,
              name: draftData.draftName || 'Untitled Draft',
              date: draftData.submittedDate || new Date().toISOString().split('T')[0]
            });
            }
          } catch (error) {
            console.error('Error loading draft:', error);
          }
        }
      }
      console.log("Loaded draft files:", draftFiles);
      setFormData(prev => ({ ...prev, draftFiles }));
    };

    loadDraftFiles();
  }, []); // Only run once on mount, not when isEditing changes

  // Clear any demo or invalid draft files on component mount
  useEffect(() => {
    // Clean up any invalid or demo draft files
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('draft_')) {
        try {
          const draftData = JSON.parse(localStorage.getItem(key));
          // Remove drafts that are actually submitted agreements or have invalid data
          if (draftData.status && draftData.status !== 'draft' && draftData.submittedDate) {
            keysToRemove.push(key);
          }
        } catch (error) {
          // Remove invalid draft files
          keysToRemove.push(key);
        }
      }
    }
    
    // Remove invalid draft files
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log("Removed invalid draft file:", key);
    });
  }, []); // Only run once on mount

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle branch selection
  const toggleBranch = (branch) => {
    setFormData(prev => {
      const currentBranches = prev.selectedBranches;
      const isCurrentlySelected = currentBranches.includes(branch);
      
      if (branch === 'Pan India') {
        // If Pan India is selected, select all branches
        // If Pan India is deselected, deselect all branches
        return {
      ...prev,
          selectedBranches: isCurrentlySelected ? [] : [...branchOptions]
        };
      } else {
        // For individual branches
        let newBranches;
        if (isCurrentlySelected) {
          // Remove the branch and also remove Pan India if it was selected
          newBranches = currentBranches.filter(b => b !== branch && b !== 'Pan India');
        } else {
          // Add the branch
          newBranches = [...currentBranches.filter(b => b !== 'Pan India'), branch];
          
          // If all individual branches are now selected, add Pan India
          const individualBranches = branchOptions.filter(b => b !== 'Pan India');
          if (individualBranches.every(b => newBranches.includes(b))) {
            newBranches = [...branchOptions];
          }
        }
        
        return {
          ...prev,
          selectedBranches: newBranches
        };
      }
    });
  };

  // Handle group companies
  const addGroupCompany = () => {
    setFormData(prev => ({
      ...prev,
      groupCompanies: [...prev.groupCompanies, '']
    }));
  };

  const removeGroupCompany = (index) => {
    setFormData(prev => ({
      ...prev,
      groupCompanies: prev.groupCompanies.filter((_, i) => i !== index)
    }));
  };

  const updateGroupCompany = (index, value) => {
    setFormData(prev => ({
      ...prev,
      groupCompanies: prev.groupCompanies.map((company, i) => 
        i === index ? value : company
      )
    }));
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    // Check if it's exactly 10 digits
    return cleanPhone.length === 10 && /^[6-9]\d{9}$/.test(cleanPhone);
  };

  const validateContactInfo = () => {
    const errors = {};
    
    // I Smart validation - MANDATORY
    const email = safeGet(formData, 'contactInfo.email');
    if (!email || email.trim() === '') {
      errors.email = 'I Smart email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address (e.g., user@example.com)';
    }
    
    const phone = safeGet(formData, 'contactInfo.phone');
    if (!phone || phone.trim() === '') {
      errors.phone = 'I Smart phone number is required';
    } else if (!validatePhone(phone)) {
      errors.phone = 'Please enter a valid 10-digit phone number starting with 6-9';
    }
    
    // Client validation - MANDATORY
    const clientEmail = safeGet(formData, 'contactInfo.clientEmail');
    if (!clientEmail || clientEmail.trim() === '') {
      errors.clientEmail = 'Client email is required';
    } else if (!validateEmail(clientEmail)) {
      errors.clientEmail = 'Please enter a valid email address (e.g., user@example.com)';
    }
    
    const clientPhone = safeGet(formData, 'contactInfo.clientPhone');
    if (!clientPhone || clientPhone.trim() === '') {
      errors.clientPhone = 'Client phone number is required';
    } else if (!validatePhone(clientPhone)) {
      errors.clientPhone = 'Please enter a valid 10-digit phone number starting with 6-9';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle clause changes
  const updateClause = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      importantClauses: prev.importantClauses.map((clause, i) => 
        i === index ? { ...clause, [field]: value } : clause
      )
    }));
  };

  const addClause = () => {
    setFormData(prev => ({
      ...prev,
      importantClauses: [...prev.importantClauses, { title: '', content: '', file: null }]
    }));
  };

  const removeClause = (index) => {
    setFormData(prev => ({
      ...prev,
      importantClauses: prev.importantClauses.filter((_, i) => i !== index)
    }));
  };

  // Handle file uploads
  const handleFileUpload = (type, file) => {
    if (file) {
      setFormData(prev => ({
        ...prev,
        uploadStatuses: {
          ...prev.uploadStatuses,
          [type]: { uploaded: true, file }
        }
      }));
    }
  };

  const handleClauseFileUpload = (clauseIndex, file) => {
    // Convert File object to serializable format
    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      // Store the file as a data URL for serialization
      dataUrl: null // We'll convert this when needed
    };
    
    // Convert file to data URL for storage
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileDataWithUrl = {
        ...fileData,
        dataUrl: e.target.result
      };
      updateClause(clauseIndex, 'file', fileDataWithUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleClientDraftUpload = (file) => {
    if (file) {
      setFormData(prev => ({
        ...prev,
        clientDraftFile: { uploaded: true, file }
      }));
    }
  };

  // Handle form submission
  const handleSubmit = (action) => {
    // Validate contact information before submission
    if (!validateContactInfo()) {
      alert('Please fix the validation errors before submitting.');
      return;
    }

    // Validate mandatory fields for submission
    if (action === 'submit') {
      const errors = [];
      
      // Check mandatory form fields
      if (!formData?.selectedClient) {
        errors.push('Client selection is required');
      }
      if (!formData?.selectedBranches || formData.selectedBranches.length === 0) {
        errors.push('At least one branch must be selected');
      }
      if (formData?.agreementType === 'Client Draft' && !formData?.clientDraftFile?.uploaded) {
        errors.push('Client draft file is required for Client Draft agreements');
      }
      if (!formData?.startDate) {
        errors.push('Start date is required');
      }
      if (!formData?.openAgreement && !formData?.endDate) {
        errors.push('End date is required for closed agreements');
      }
      
      // Check document uploads - at least one document required
      const hasAnyDocument = formData.uploadStatuses?.WO?.uploaded || 
                            formData.uploadStatuses?.PO?.uploaded || 
                            formData.uploadStatuses?.LOI?.uploaded || 
                            formData.uploadStatuses?.EmailApproval?.uploaded;
      
      if (!hasAnyDocument) {
        errors.push('At least one document (WO, PO, LOI, or Email) must be uploaded');
      }
      
      if (errors.length > 0) {
        alert('Please fix the following errors before submitting:\n\n' + errors.join('\n'));
        return;
      }
    }

    const agreementData = {
      ...formData,
      status: action === 'submit' ? 'Under Review' : 'Draft',
      submittedDate: new Date().toISOString().split('T')[0],
      submittedBy: user?.role || 'checker'
    };

    // Debug: Log the agreement data being submitted
    console.log("=== FORM SUBMISSION DEBUG ===");
    console.log("action:", action);
    console.log("formData.uploadStatuses:", formData.uploadStatuses);
    console.log("agreementData.uploadStatuses:", agreementData.uploadStatuses);
    console.log("formData.contactInfo:", formData.contactInfo);
    console.log("agreementData.contactInfo:", agreementData.contactInfo);
    console.log("Full agreementData:", agreementData);

    if (action === 'draft') {
      // Save as draft to localStorage
      const draftId = `draft_${Date.now()}`;
      const draftData = {
        ...agreementData,
        id: draftId,
        draftName: `${formData?.selectedClient || 'Untitled'} - ${new Date().toLocaleDateString()}`
      };
      
      localStorage.setItem(draftId, JSON.stringify(draftData));
      
      // Add to draft files list
      setFormData(prev => ({
        ...prev,
        draftFiles: [
          ...prev.draftFiles,
          { id: draftId, name: draftData.draftName, date: new Date().toISOString() }
        ]
      }));
      
      alert('Draft saved successfully!');
      return;
    }

    if (isEditing) {
      console.log("Updating agreement:", editingAgreement.id, agreementData);
      dispatch(updateAgreement({ id: editingAgreement.id, updates: agreementData }));
    } else {
      console.log("Creating new agreement:", agreementData);
      dispatch(createAgreement(agreementData));
    }

    // Reset form and navigate
    setFormData({
      selectedClient: '',
      selectedDepartment: '',
      selectedBranches: [],
      agreementType: '',
      startDate: '',
      endDate: '',
      openAgreement: false,
      remarks: '',
      entityType: 'single',
      groupCompanies: [''],
      importantClauses: [
        { title: 'Term and termination (Duration)', content: '', file: null },
        { title: 'Payment Terms', content: '', file: null },
        { title: 'Penalty', content: '', file: null },
        { title: 'Minimum Wages', content: '', file: null },
        { title: 'Costing - Salary Breakup', content: '', file: null },
        { title: 'SLA', content: '', file: null },
        { title: 'Indemnity', content: '', file: null },
        { title: 'Insurance', content: '', file: null }
      ],
      contactInfo: {
        name: '',
        email: '',
        phone: '',
        clientName: '',
        clientEmail: '',
        clientPhone: ''
      },
      uploadStatuses: {
        LOI: { uploaded: false, file: null },
        WO: { uploaded: false, file: null },
        PO: { uploaded: false, file: null },
        EmailApproval: { uploaded: false, file: null }
      },
      clientDraftFile: { uploaded: false, file: null }
    });

    dispatch(setEditingAgreement(null));
    dispatch(setActiveTab('agreements'));
  };

  // Show loading state if form is not ready
  if (!isFormReady) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading form...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-100 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing && formData?.isRenewal ? 'Editing Agreement' : (isEditing ? 'Edit Agreement' : 'New Agreement')}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditing && formData?.isRenewal 
            ? `Agreement ID: ${formData?.originalAgreementId || 'N/A'} • Client: ${formData?.selectedClient}`
            : (isEditing ? 'Update agreement details' : 'Create a new agreement')
          }
        </p>
        
        {/* Renewal Banner - like live URL */}
        {isEditing && formData?.isRenewal && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Renewing Agreement
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Agreement ID: {formData?.originalAgreementId || 'N/A'}</p>
                  <p>Client: {formData?.selectedClient}</p>
                  <p>Original Agreement: {formData?.originalAgreementId}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
            </div>

      <form className="space-y-6">
        {/* User Information */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Role
              </label>
              <input
                type="text"
                value="checker"
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name *
              </label>
              <select
                value={formData.selectedClient}
                onChange={(e) => handleInputChange('selectedClient', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Client</option>
                {clientOptions.map(client => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Branch(s) *
              </label>
              {!formData.selectedClient ? (
                <input
                  type="text"
                  value="Please select a client first"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              ) : (
                <div className="relative">
              <button
                type="button"
                    onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex justify-between items-center"
                  >
                    <span className="font-medium text-gray-900">
                      {formData.selectedBranches.length === 0 
                        ? 'Select client branches...' 
                        : formData.selectedBranches.length === branchOptions.length
                        ? 'Pan India (All Branches)'
                        : `${formData.selectedBranches.length} branch${formData.selectedBranches.length === 1 ? '' : 'es'} selected`
                  }
                </span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
                  {/* Selected Branch Tags */}
                  {formData.selectedBranches.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.selectedBranches.includes('Pan India') ? (
                        // If Pan India is selected, only show Pan India tag
                        <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          <span className="mr-1">Pan India</span>
                          <button
                            type="button"
                            onClick={() => toggleBranch('Pan India')}
                            className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        // If Pan India is not selected, show individual branch tags
                        formData.selectedBranches.map((branch, index) => (
                        <div key={typeof branch === 'string' ? branch : `branch-${index}`} className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          <span className="mr-1">
                              {(() => {
                                const branchName = typeof branch === 'string' ? branch : branch.name;
                                return branchName === 'Mumbai' ? 'Mumbai Branch (MUM)' :
                                       branchName === 'Delhi' ? 'Delhi Branch (DEL)' :
                                       branchName === 'Bangalore' ? 'Bangalore Branch (BLR)' :
                                       branchName === 'Pune' ? 'Pune Branch (PUN)' :
                                       branchName === 'Chennai' ? 'Chennai Branch (CHE)' :
                                       branchName === 'Hyderabad' ? 'Hyderabad Branch (HYD)' :
                                       branchName === 'Kolkata' ? 'Kolkata Branch (KOL)' :
                                       branchName;
                              })()}
                          </span>
                      <button
                        type="button"
                            onClick={() => toggleBranch(typeof branch === 'string' ? branch : branch.name)}
                            className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                      >
                            ×
                      </button>
                    </div>
                        ))
                      )}
                        </div>
                  )}
                  
                  {showBranchDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                      <div className="max-h-60 overflow-y-auto">
                        {branchOptions.map(branch => (
                          <label key={branch} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.selectedBranches.includes(branch)}
                              onChange={() => toggleBranch(branch)}
                              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="text-sm font-medium text-gray-900">{branch}</div>
                          </label>
                        ))}
                    </div>
                      <div className="border-t border-gray-200 p-3">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm text-gray-600">
                            {formData.selectedBranches.length} of {branchOptions.length} selected
                        </span>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (formData.selectedBranches.length === branchOptions.length) {
                                // If all are selected, deselect all
                                setFormData(prev => ({
                                  ...prev,
                                  selectedBranches: []
                                }));
                              } else {
                                // Select all branches
                                setFormData(prev => ({
                                  ...prev,
                                  selectedBranches: [...branchOptions]
                                }));
                              }
                            }}
                            className="px-3 py-1 border border-gray-300 text-gray-700 bg-white rounded text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {formData.selectedBranches.length === branchOptions.length ? 'Deselect All' : 'Select All'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowBranchDropdown(false)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            Done
                          </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
                )}
              </div>
          </div>
        </div>


        {/* Alert Message - Moved to be more prominent */}
          {(() => {
          // Show alert if endDate is selected and not open agreement
          if (formData.endDate && !formData.openAgreement) {
            
            const today = new Date();
            const toDate = new Date(formData.endDate + 'T00:00:00');
            const daysUntilExpiry = Math.ceil((toDate - today) / (1000 * 60 * 60 * 24));
            
            let alertMessage = '';
            let alertColor = 'yellow';
            
            if (daysUntilExpiry <= 0) {
              alertMessage = `This agreement has expired ${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) !== 1 ? 's' : ''} ago. Please ensure at least one required document (LOI, WO, PO, or Email Approval) is uploaded for renewal/escalation.`;
              alertColor = 'red';
            } else if (daysUntilExpiry <= 30) {
              alertMessage = `This agreement is expiring in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. Please ensure at least one required document (LOI, WO, PO, or Email Approval) is uploaded for renewal/escalation.`;
              alertColor = 'yellow';
            } else {
              alertMessage = `Please ensure at least one required document (LOI, WO, PO, or Email Approval) is uploaded for this agreement.`;
              alertColor = 'yellow';
            }
            
            return (
              <div className={`mb-6 p-4 ${alertColor === 'red' ? 'bg-red-50 border-l-4 border-red-400' : 'bg-yellow-50 border-l-4 border-yellow-400'} rounded-md`}>
                <div className="flex">
                  <div className="ml-3">
                    <p className={`text-sm ${alertColor === 'red' ? 'text-red-800' : 'text-yellow-800'}`}>
                      <strong>Alert:</strong> {alertMessage}
                    </p>
                    <p className="text-sm text-red-600 mt-1">
                      <strong>Escalation:</strong> At least one document is required (LOI, WO, PO, or Email Approval)
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          
            // Only show alerts if BOTH dates are selected (not on fresh page) and not open agreement
            if (!formData.startDate || !formData.endDate || formData.openAgreement) {
              return null;
            }
            
            const today = new Date();
            const toDate = new Date(formData.endDate + 'T00:00:00'); // Ensure consistent timezone
            const daysUntilExpiry = Math.ceil((toDate - today) / (1000 * 60 * 60 * 24));
            const noDocumentsUploaded = Object.values(formData.uploadStatuses).every(status => !status.uploaded);
            
          console.log("Alert Debug - daysUntilExpiry:", daysUntilExpiry);
          console.log("Alert Debug - noDocumentsUploaded:", noDocumentsUploaded);
          
          // SIMPLIFIED: Always show alert when dates are selected and not open agreement
          if (formData.startDate && formData.endDate && !formData.openAgreement) {
              let alertMessage = '';
              let alertColor = 'yellow';
              
              if (daysUntilExpiry <= 0) {
                alertMessage = `This agreement has expired ${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) !== 1 ? 's' : ''} ago. Please ensure at least one required document (LOI, WO, PO, or Email Approval) is uploaded for renewal/escalation.`;
                alertColor = 'red';
              } else if (daysUntilExpiry <= 30) {
                alertMessage = `This agreement is expiring in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. Please ensure at least one required document (LOI, WO, PO, or Email Approval) is uploaded for renewal/escalation.`;
                alertColor = 'yellow';
            } else {
              // For dates more than 30 days away, show a general alert
              alertMessage = `Please ensure at least one required document (LOI, WO, PO, or Email Approval) is uploaded for this agreement.`;
              alertColor = 'yellow';
              }
            
            console.log("Alert Debug - Showing alert with message:", alertMessage);
              
              return (
                <div className={`mb-6 p-4 ${alertColor === 'red' ? 'bg-red-50 border-l-4 border-red-400' : 'bg-yellow-50 border-l-4 border-yellow-400'} rounded-md`}>
                  <div className="flex">
                    <div className="ml-3">
                      <p className={`text-sm ${alertColor === 'red' ? 'text-red-800' : 'text-yellow-800'}`}>
                        <strong>Alert:</strong> {alertMessage}
                      </p>
                      <p className="text-sm text-red-600 mt-1">
                        <strong>Escalation:</strong> At least one document is required (LOI, WO, PO, or Email Approval)
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
          
            return null;
          })()}

        {/* Document Uploads */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Uploads</h2>
          <p className="text-sm text-gray-600 mb-4">Upload at least one of the following documents: LOI, WO, PO, or Email Approval</p>
          
                    {/* Agreement Duration */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Agreement Duration</h3>
            <label className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={formData?.openAgreement || false}
                onChange={(e) => handleInputChange('openAgreement', e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Open Agreement (No End Date)</span>
            </label>
            <p className="text-xs text-gray-500 mb-4">
              {formData?.openAgreement ? "Only 'From Date' is required" : "Both 'From Date' and 'To Date' are required"}
            </p>

            {/* Date Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Date *
                </label>
                <input
                  type="date"
                  value={formData?.startDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              {!formData?.openAgreement && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Date *
                  </label>
                  <input
                    type="date"
                    value={formData?.endDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Upload Areas */}
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(formData.uploadStatuses).map(([type, status]) => (
              <div key={type} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <div className="flex flex-col items-center">
                  <svg className="w-8 h-8 text-blue-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    {type === 'LOI' ? 'LOI (Letter of Intent)' :
                     type === 'WO' ? 'WO (Work Order)' :
                     type === 'PO' ? 'PO (Purchase Order)' :
                     type === 'EmailApproval' ? 'Email Approval (Email Approval)' : type}
                  </div>
                  {status.uploaded ? (
                    <div className="space-y-3">
                      <div className="text-green-600 text-sm font-medium">
                        ✓ {status.file?.name || 'File uploaded'}
                      </div>
                      <div className="flex justify-center space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                            if (status.file) {
                              const url = URL.createObjectURL(status.file);
                              window.open(url, '_blank');
                            }
                            }}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            View
                          </button>
                          <button
                            type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              uploadStatuses: {
                                ...prev.uploadStatuses,
                                [type]: { uploaded: false, file: null }
                              }
                            }));
                          }}
                          className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                  ) : (
                    <div className="space-y-4">
                      <input
                        type="file"
                        onChange={(e) => handleFileUpload(type, e.target.files[0])}
                        className="hidden"
                        id={`upload-${type}`}
                        accept=".pdf,.docx,.jpg,.jpeg,.png"
                      />
                      <label
                        htmlFor={`upload-${type}`}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        Choose File
                      </label>
                      <p className="text-xs text-gray-500 mt-2">
                        or drag and drop your file here
                      </p>
                      <p className="text-xs text-gray-400">
                        Max size: 10MB - Allowed: pdf, docx, jpg, jpeg, png
                      </p>
                      </div>
                    )}
                  </div>
                </div>
            ))}
          </div>
        </div>

        {/* Remarks */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Remarks</h2>
          <textarea
            value={formData.remarks}
            onChange={(e) => handleInputChange('remarks', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add any additional remarks..."
          />
        </div>

        {/* Entity Type */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Entity Type</h2>
          <p className="text-sm text-gray-500 mb-4">Specify if this is a single entity or group agreement.</p>
          <div className="flex space-x-6">
            <label className="flex items-center">
              <input
                type="radio"
                value="single"
                checked={formData.entityType === 'single'}
                onChange={(e) => handleInputChange('entityType', e.target.value)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Single Entity</span>
            </label>
            <label className="flex items-center">
                <input
                  type="radio"
                value="multiple"
                checked={formData.entityType === 'multiple'}
                onChange={(e) => handleInputChange('entityType', e.target.value)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Single Entity with Group Companies</span>
              </label>
          </div>

          {/* Group Companies section */}
          {formData.entityType === 'multiple' && (
            <div className="mt-4">
              {formData.groupCompanies.map((company, index) => (
                <div key={index} className="flex items-center mb-2">
                      <input
                    type="text"
                    value={company}
                    onChange={(e) => updateGroupCompany(index, e.target.value)}
                    placeholder="Under list/annexure"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.groupCompanies.length > 1 && (
                        <button
                          type="button"
                      onClick={() => removeGroupCompany(index)}
                      className="ml-2 w-6 h-6 bg-red-600 text-white rounded flex items-center justify-center hover:bg-red-700"
                        >
                      ×
                        </button>
                      )}
                    </div>
                  ))}
                    <button
                      type="button"
                onClick={addGroupCompany}
                className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      +
                    </button>
                </div>
              )}
            </div>

        {/* Agreement Type Selection */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Agreement Type Selection</h2>
          <p className="text-sm text-gray-500 mb-4">Identify the origin of the agreement draft.</p>
          <div className="flex space-x-6">
            {agreementTypeOptions.map(type => (
              <label key={type} className="flex items-center">
                <input
                type="radio"
                  name="agreementType"
                  value={type}
                  checked={formData.agreementType === type}
                  onChange={(e) => {
                    const selectedType = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      agreementType: selectedType,
                      clientDraftFile: selectedType === 'Client Draft'
                        ? prev.clientDraftFile
                        : { uploaded: false, file: null }
                    }));
                  }}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">{type}</span>
            </label>
            ))}
          </div>

          {formData.agreementType === 'Client Draft' && (
            <div className="mt-4 border-2 border-dashed border-gray-300 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Upload Client Draft</div>
              {formData.clientDraftFile?.uploaded ? (
                <div className="space-y-2">
                  <div className="text-green-600 text-sm font-medium">
                    ✓ {formData.clientDraftFile.file?.name || 'File uploaded'}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.clientDraftFile?.file) {
                          const url = URL.createObjectURL(formData.clientDraftFile.file);
                          window.open(url, '_blank');
                        }
                      }}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData(prev => ({
                          ...prev,
                          clientDraftFile: { uploaded: false, file: null }
                        }))
                      }
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    onChange={(e) => handleClientDraftUpload(e.target.files[0])}
                    className="hidden"
                    id="upload-client-draft"
                    accept=".pdf,.doc,.docx"
                  />
                  <label
                    htmlFor="upload-client-draft"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 cursor-pointer"
                  >
                    Choose Client Draft
                  </label>
                  <p className="text-xs text-gray-500 mt-2">Allowed: pdf, doc, docx</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Important Clauses */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Important Clauses</h2>
          <p className="text-sm text-gray-500 mb-4">Add important clauses and supporting documents</p>
          <div className="space-y-4">
            {(formData.importantClauses || []).map((clause, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Clause {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeClause(index)}
                    className="w-6 h-6 bg-red-600 text-white rounded flex items-center justify-center hover:bg-red-700"
                  >
                    ×
                  </button>
                </div>
                
                                {/* Clause Title Input */}
                <div className="mb-3">
                    <input
                    type="text"
                      value={clause.title}
                    onChange={(e) => updateClause(index, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter clause title..."
                    />
                  </div>
                  
                {/* File Management Section */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    {!clause.file ? (
                      <div>
                      <input
                        type="file"
                          onChange={(e) => handleClauseFileUpload(index, e.target.files[0])}
                        className="hidden"
                          id={`clause-file-${index}`}
                          accept=".pdf,.doc,.docx"
                        />
                        <label
                          htmlFor={`clause-file-${index}`}
                          className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          Upload File
                    </label>
                        </div>
                    ) : (
                      <div>
                          <button
                            type="button"
                            onClick={() => {
                            const input = document.getElementById(`clause-file-${index}`);
                            input.click();
                          }}
                          className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          Change File
                        </button>
                        <div className="mt-1">
                          <p className="text-xs text-gray-500 truncate max-w-xs">{clause.file.name}</p>
                          <div className="flex space-x-2 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (clause.file.dataUrl) {
                                  // For serialized files, open data URL
                                  window.open(clause.file.dataUrl, '_blank');
                                } else if (clause.file instanceof File) {
                                  // For File objects, create object URL
                                const url = URL.createObjectURL(clause.file);
                              window.open(url, '_blank');
                                }
                            }}
                              className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            View
                          </button>
                          <button
                            type="button"
                              onClick={() => updateClause(index, 'file', null)}
                              className="text-xs text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Clause Details Input */}
                  <textarea
                  value={clause.content}
                  onChange={(e) => updateClause(index, 'content', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter clause details..."
                />
              </div>
            ))}
          </div>
            <button
              type="button"
            onClick={addClause}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
            + Add Clause
            </button>
          </div>

        {/* Contact Information */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Contact Information</h2>
          <p className="text-sm text-gray-500 mb-4">Contact details for I Smart and Client</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* I Smart Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="px-4 py-2 bg-white border-2 border-blue-500 rounded-full">
                  <span className="text-blue-600 font-medium text-sm">I Smart</span>
                </div>
              </div>
              
              <div className="space-y-3">
            <div>
              <input
                type="text"
                    value={safeGet(formData, 'contactInfo.name')}
                    onChange={(e) => handleInputChange('contactInfo', { ...(formData.contactInfo || {}), name: e.target.value })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter name"
              />
            </div>
                
            <div>
                  <input
                    type="tel"
                    value={safeGet(formData, 'contactInfo.phone')}
                    onChange={(e) => {
                      handleInputChange('contactInfo', { ...(formData.contactInfo || {}), phone: e.target.value });
                      if (validationErrors.phone) {
                        setValidationErrors(prev => ({ ...prev, phone: '' }));
                      }
                    }}
                    onBlur={() => {
                      const phone = safeGet(formData, 'contactInfo.phone');
                      if (phone && !validatePhone(phone)) {
                        setValidationErrors(prev => ({ ...prev, phone: 'Please enter a valid 10-digit phone number starting with 6-9' }));
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.phone ? 'border-red-500' : 'border-blue-300'
                    }`}
                    placeholder="Enter phone number"
                  />
                  {validationErrors.phone && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
                  )}
                </div>
                
                <div>
                             <input
                type="email"
                    value={safeGet(formData, 'contactInfo.email')}
                onChange={(e) => {
                      handleInputChange('contactInfo', { ...(formData.contactInfo || {}), email: e.target.value });
                  if (validationErrors.email) {
                    setValidationErrors(prev => ({ ...prev, email: '' }));
                  }
                }}
                onBlur={() => {
                      const email = safeGet(formData, 'contactInfo.email');
                      if (email && !validateEmail(email)) {
                        setValidationErrors(prev => ({ ...prev, email: 'Please enter a valid email address (e.g., user@example.com)' }));
                  }
                }}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.email ? 'border-red-500' : 'border-blue-300'
                }`}
                    placeholder="Enter email"
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>
              </div>
            </div>

            {/* Client Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="px-4 py-2 bg-white border-2 border-blue-500 rounded-full">
                  <span className="text-blue-600 font-medium text-sm">Client</span>
                </div>
              </div>
              
              <div className="space-y-3">
            <div>
                  <input
                    type="text"
                    value={safeGet(formData, 'contactInfo.clientName')}
                    onChange={(e) => handleInputChange('contactInfo', { ...(formData.contactInfo || {}), clientName: e.target.value })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter name"
                  />
                </div>
                
                <div>
              <input
                type="tel"
                    value={safeGet(formData, 'contactInfo.clientPhone')}
                onChange={(e) => {
                      handleInputChange('contactInfo', { ...(formData.contactInfo || {}), clientPhone: e.target.value });
                      if (validationErrors.clientPhone) {
                        setValidationErrors(prev => ({ ...prev, clientPhone: '' }));
                  }
                }}
                onBlur={() => {
                      const clientPhone = safeGet(formData, 'contactInfo.clientPhone');
                      if (clientPhone && !validatePhone(clientPhone)) {
                        setValidationErrors(prev => ({ ...prev, clientPhone: 'Please enter a valid 10-digit phone number starting with 6-9' }));
                  }
                }}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.clientPhone ? 'border-red-500' : 'border-blue-300'
                }`}
                placeholder="Enter phone number"
              />
                  {validationErrors.clientPhone && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.clientPhone}</p>
                  )}
                </div>
                
                <div>
                  <input
                    type="email"
                    value={safeGet(formData, 'contactInfo.clientEmail')}
                    onChange={(e) => {
                      handleInputChange('contactInfo', { ...(formData.contactInfo || {}), clientEmail: e.target.value });
                      if (validationErrors.clientEmail) {
                        setValidationErrors(prev => ({ ...prev, clientEmail: '' }));
                      }
                    }}
                    onBlur={() => {
                      const clientEmail = safeGet(formData, 'contactInfo.clientEmail');
                      if (clientEmail && !validateEmail(clientEmail)) {
                        setValidationErrors(prev => ({ ...prev, clientEmail: 'Please enter a valid email address (e.g., user@example.com)' }));
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.clientEmail ? 'border-red-500' : 'border-blue-300'
                    }`}
                    placeholder="Enter email"
                  />
                  {validationErrors.clientEmail && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.clientEmail}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          {/* Draft Files Display */}
          <div className="flex items-center space-x-4">
            {formData.draftFiles && formData.draftFiles.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Draft Files:</span>
                {formData.draftFiles.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        console.log("Draft file clicked:", file.name, "ID:", file.id);
                        
                        // Open draft file for editing
                        const draftAgreement = JSON.parse(localStorage.getItem(file.id) || '{}');
                        console.log("Loading draft file:", file.id, "Data:", draftAgreement);
                        
                        // Ensure the draft data has all required fields
                        const safeDraftData = {
                          ...draftAgreement,
                          contactInfo: draftAgreement.contactInfo || {
                            name: '',
                            email: '',
                            phone: '',
                            clientName: '',
                            clientEmail: '',
                            clientPhone: '',
                            ismartName: '',
                            ismartEmail: '',
                            ismartPhone: ''
                          },
                          importantClauses: draftAgreement.importantClauses || [
                            { title: 'Term and termination (Duration)', content: '', file: null },
                            { title: 'Payment Terms', content: '', file: null },
                            { title: 'Penalty', content: '', file: null },
                            { title: 'Minimum Wages', content: '', file: null },
                            { title: 'Costing - Salary Breakup', content: '', file: null },
                            { title: 'SLA', content: '', file: null },
                            { title: 'Indemnity', content: '', file: null },
                            { title: 'Insurance', content: '', file: null }
                          ],
                          selectedBranches: draftAgreement.selectedBranches || [],
                          groupCompanies: draftAgreement.groupCompanies || [''],
                          uploadStatuses: draftAgreement.uploadStatuses || {
                            LOI: { uploaded: false, file: null },
                            WO: { uploaded: false, file: null },
                            PO: { uploaded: false, file: null },
                            EmailApproval: { uploaded: false, file: null }
                          },
                          clientDraftFile: draftAgreement.clientDraftFile || { uploaded: false, file: null }
                        };
                        
                        console.log("Setting form data with safe draft data:", safeDraftData);
                        setFormData(safeDraftData);
                        console.log("Dispatching setEditingAgreement...");
                        dispatch(setEditingAgreement(safeDraftData));
                        console.log("Draft loading completed");
                      }}
                      className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>{file.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Delete draft file
                        const updatedDrafts = formData.draftFiles.filter((_, i) => i !== index);
                        setFormData(prev => ({ ...prev, draftFiles: updatedDrafts }));
                        localStorage.removeItem(`draft_${file.id}`);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
              <button
                type="button"
            onClick={() => handleSubmit('draft')}
            className="px-6 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Save Draft
            </button>
          <button
            type="button"
            onClick={() => handleSubmit('submit')}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isEditing && formData?.isRenewal ? 'Update Agreement' : 'Submit for Review'}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                dispatch(setEditingAgreement(null));
                dispatch(setActiveTab('agreements'));
              }}
              className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel Edit
            </button>
          )}
          </div>
        </div>
      </form>
  </div>
  );
};

export default AgreementForm; 
