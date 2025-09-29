import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useAppState } from "../hooks/useRedux";
import { useDispatch } from "react-redux";
import { setShowAddendumForm, setEditingAddendum, closeAllModals, setActiveTab } from "../slice/uiSlice";
import { createAddendum } from "../slice/addendumsSlice";

const AddendumForm = () => {
  console.log("=== ADDENDUM FORM RENDERING ===");
  const dispatch = useDispatch();
  const { agreements, addendums, ui } = useAppState();
  const { agreements: agreementsList } = agreements;
  const { actions: addendumsActions } = addendums;
  const { editingAddendum, actions: uiActions } = ui;
  
  console.log("AddendumForm - editingAddendum:", editingAddendum);
  console.log("AddendumForm - ui state:", ui);
  console.log("AddendumForm - editingAddendum type:", typeof editingAddendum);
  console.log("AddendumForm - editingAddendum keys:", editingAddendum ? Object.keys(editingAddendum) : "null");
  
  // Debug parent agreement ID specifically
  if (editingAddendum) {
    console.log("✅ editingAddendum found:", editingAddendum);
    console.log("✅ parentAgreementId:", editingAddendum.parentAgreementId);
    console.log("✅ parentAgreementTitle:", editingAddendum.parentAgreementTitle);
  } else {
    console.log("❌ editingAddendum is null/undefined");
    console.log("❌ This means the parent agreement data was not set properly");
  }

  const [form, setForm] = useState({
    title: "",
    description: "",
    effectiveDate: new Date(),
    reason: "",
    impact: "",
    additionalDocuments: [],
    branches: []
  });
  
  const [errors, setErrors] = useState({});
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Clause modification tracking
  const [clauseModifications, setClauseModifications] = useState([]);
  const [showClauseModificationForm, setShowClauseModificationForm] = useState(false);
  
  // State for the clause modification form inputs
  const [clauseForm, setClauseForm] = useState({
    clause: "",
    action: "modified",
    description: ""
  });
  
  // Debug clauseForm state changes
  console.log("AddendumForm - clauseForm state:", clauseForm);
  
  // Add branch management state
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchDescription, setNewBranchDescription] = useState("");
  const [editingBranchId, setEditingBranchId] = useState(null);

  // Handle editing mode - pre-fill form when editingAddendum is provided
  useEffect(() => {
    console.log("=== ADDENDUM FORM useEffect ===");
    console.log("editingAddendum:", editingAddendum);
    console.log("editingAddendum.id:", editingAddendum?.id);
    console.log("editingAddendum.isNew:", editingAddendum?.isNew);
    
    // Reset form state first
    setForm({
      title: "",
      description: "",
      effectiveDate: new Date(),
      reason: "",
      impact: "",
      additionalDocuments: [],
      branches: []
    });
    setUploadedFiles({});
    setClauseModifications([]);
    setErrors({});
    
    if (editingAddendum && editingAddendum.id) {
      // This is an existing addendum being edited
      console.log("Setting edit mode to TRUE - existing addendum");
      setIsEditMode(true);
      setForm({
        title: editingAddendum.title || "",
        description: editingAddendum.description || "",
        effectiveDate: editingAddendum.effectiveDate ? new Date(editingAddendum.effectiveDate) : new Date(),
        reason: editingAddendum.reason || "",
        impact: editingAddendum.impact || "",
        additionalDocuments: editingAddendum.additionalDocuments || [],
        branches: editingAddendum.branches || []
      });
      setUploadedFiles(editingAddendum.uploadedFiles || {});
      setClauseModifications(editingAddendum.clauseModifications || []);
    } else {
      // This is a new addendum or no addendum data
      console.log("Setting edit mode to FALSE - new addendum");
      setIsEditMode(false);
      setClauseModifications([]);
      
      // Pre-fill form with parent agreement data if available
      if (editingAddendum && editingAddendum.parentAgreementId) {
        console.log("Pre-filling form with parent agreement data");
        setForm({
          title: editingAddendum.title || "",
          description: editingAddendum.description || "",
          effectiveDate: editingAddendum.effectiveDate ? new Date(editingAddendum.effectiveDate) : new Date(),
          reason: editingAddendum.reason || "",
          impact: editingAddendum.impact || "",
          additionalDocuments: editingAddendum.additionalDocuments || [],
          branches: editingAddendum.branches || []
        });
        setUploadedFiles(editingAddendum.uploadedFiles || {});
      }
    }
  }, [editingAddendum]);

  const validateForm = () => {
    const newErrors = {};
    if (!form.title.trim()) newErrors.title = "Title is required";
    if (!form.description.trim()) newErrors.description = "Description is required";
    if (!form.reason.trim()) newErrors.reason = "Reason is required";
    if (!form.impact.trim()) newErrors.impact = "Impact is required";
    return newErrors;
  };

  // Branch management functions
  const handleAddBranch = () => {
    if (!newBranchName.trim()) return;
    
    const newBranch = {
      id: `branch-${Date.now()}`,
      name: newBranchName,
      description: newBranchDescription,
      createdAt: new Date().toLocaleDateString(),
      status: "Active"
    };
    
      setForm(prev => ({
        ...prev,
        branches: [...prev.branches, newBranch]
      }));
    
    setNewBranchName("");
    setNewBranchDescription("");
  };

  const handleEditBranch = (id) => {
    const branch = form.branches.find(b => b.id === id);
    if (branch) {
      setNewBranchName(branch.name);
      setNewBranchDescription(branch.description);
      setEditingBranchId(id);
    }
  };

  const handleRemoveBranch = (id) => {
    setForm(prev => ({
      ...prev,
      branches: prev.branches.filter(b => b.id !== id)
    }));
  };

  const handleCancelBranchEdit = () => {
    setNewBranchName("");
    setNewBranchDescription("");
    setEditingBranchId(null);
  };

  // Clause modification functions
  const handleAddClauseModification = () => {
    console.log("=== ADD MODIFICATION BUTTON CLICKED ===");
    console.log("Current clauseForm:", clauseForm);
    console.log("Clause title:", clauseForm.clause);
    console.log("Description:", clauseForm.description);
    console.log("Action:", clauseForm.action);
    
    if (clauseForm.clause.trim() && clauseForm.description.trim()) {
      console.log("Validation passed, creating new modification...");
      const newModification = {
        clause: clauseForm.clause,
        description: clauseForm.description,
        action: clauseForm.action
      };
      console.log("New modification:", newModification);
      
      setClauseModifications(prev => {
        const updated = [...prev, newModification];
        console.log("Updated clauseModifications:", updated);
        return updated;
      });
      
      setClauseForm({ clause: "", action: "modified", description: "" });
      setShowClauseModificationForm(false);
      console.log("Modal closed and form reset");
    } else {
      console.log("Validation failed - missing required fields");
      console.log("Clause title empty:", !clauseForm.clause.trim());
      console.log("Description empty:", !clauseForm.description.trim());
    }
  };

  const handleUpdateClauseModification = (index, field, value) => {
    const newMods = [...clauseModifications];
    newMods[index][field] = value;
    setClauseModifications(newMods);
  };

  const handleRemoveClauseModification = (index) => {
    setClauseModifications(prev => prev.filter((_, i) => i !== index));
  };

  const handleCancelClauseModification = () => {
    setClauseForm({ clause: "", action: "modified", description: "" });
    setShowClauseModificationForm(false);
  };

  const handleOpenClauseModificationForm = () => {
    setClauseForm({ clause: "", action: "modified", description: "" });
    setShowClauseModificationForm(true);
  };

    const handleSubmit = () => {
    console.log("=== ADDENDUM SUBMISSION STARTED ===");
    console.log("Submit button clicked");
    console.log("Current form data:", form);
    console.log("Current clauseModifications:", clauseModifications);
    console.log("Current uploadedFiles:", uploadedFiles);
    
    if (isSubmitting) { 
      console.log("Already submitting, returning");
      return; 
    }
    setIsSubmitting(true);
    
    try {
      console.log("Validating form...");
      const validationErrors = validateForm();
      console.log("Validation errors:", validationErrors);
      
      if (Object.keys(validationErrors).length > 0) {
        console.log("Validation failed, setting errors");
        setErrors(validationErrors);
        setIsSubmitting(false);
        return;
      }
      
      console.log("Validation passed, preparing addendum data...");
      
      // Convert File objects to serializable data
      const serializedUploadedFiles = {};
      Object.keys(uploadedFiles).forEach(key => {
        const fileData = uploadedFiles[key];
        if (fileData && fileData.file instanceof File) {
          // Convert File object to serializable data
          serializedUploadedFiles[key] = {
            name: fileData.file.name,
            size: fileData.file.size,
            type: fileData.file.type,
            lastModified: fileData.file.lastModified,
            uploaded: fileData.uploaded || false
          };
        } else {
          // Keep non-File data as is
          serializedUploadedFiles[key] = fileData;
        }
      });
      
      console.log("Original uploadedFiles:", uploadedFiles);
      console.log("Serialized uploadedFiles:", serializedUploadedFiles);
      console.log("Clause modifications:", clauseModifications);
      
      // Ensure clauseModifications is serializable
      const serializedClauseModifications = clauseModifications.map(mod => ({
        clause: mod.clause || "",
        action: mod.action || "modified",
        description: mod.description || ""
      }));
      
      // Ensure branches is serializable
      const serializedBranches = (form.branches || []).map(branch => ({
        id: branch.id || "",
        name: branch.name || "",
        description: branch.description || "",
        createdAt: branch.createdAt || "",
        status: branch.status || "Active"
      }));
      
      const addendumData = {
        id: editingAddendum?.id || `ADD${Date.now()}`,
        title: form.title,
        description: form.description,
        effectiveDate: form.effectiveDate.toISOString().split('Z')[0],
        reason: form.reason,
        impact: form.impact,
        uploadedFiles: serializedUploadedFiles,
        clauseModifications: serializedClauseModifications,
        parentAgreementId: editingAddendum?.parentAgreementId,
        parentAgreementTitle: editingAddendum?.parentAgreementTitle,
        submittedDate: new Date().toISOString().split('T')[0],
        submittedBy: "checker",
        status: "Pending Review",
        branches: serializedBranches
      };
      
      console.log("=== ADDENDUM DATA DEBUG ===");
      console.log("editingAddendum:", editingAddendum);
      console.log("editingAddendum type:", typeof editingAddendum);
      console.log("editingAddendum keys:", editingAddendum ? Object.keys(editingAddendum) : "null");
      console.log("parentAgreementId:", addendumData.parentAgreementId);
      console.log("parentAgreementId type:", typeof addendumData.parentAgreementId);
      console.log("parentAgreementTitle:", addendumData.parentAgreementTitle);
      console.log("Available agreements:", agreementsList);
      
      // Check if parentAgreementId is missing
      if (!addendumData.parentAgreementId) {
        console.error("❌ MISSING PARENT AGREEMENT ID!");
        console.error("editingAddendum:", editingAddendum);
        console.error("This will cause the addendum to not display in agreement cards!");
        setErrorModalMessage("Error: Parent Agreement ID is missing. Please try again.");
        setShowErrorModal(true);
        setIsSubmitting(false);
        return;
      }
      
      // Set fallback title if missing
      if (!addendumData.parentAgreementTitle) {
        addendumData.parentAgreementTitle = `Agreement ${addendumData.parentAgreementId}`;
        console.log("Set fallback title:", addendumData.parentAgreementTitle);
      }
      
      if (isEditMode && editingAddendum) {
        addendumData.originalSubmittedDate = editingAddendum.submittedDate;
        addendumData.originalSubmittedBy = editingAddendum.submittedBy;
      }
      
      console.log("=== ADDENDUM DATA PREPARED ===");
      console.log("Addendum data prepared:", addendumData);
      console.log("Parent Agreement ID:", addendumData.parentAgreementId);
      console.log("Parent Agreement ID type:", typeof addendumData.parentAgreementId);
      console.log("Parent Agreement Title:", addendumData.parentAgreementTitle);
      console.log("Available actions:", addendumsActions);
      console.log("editingAddendum:", editingAddendum);
      
      if (isEditMode) {
        console.log("Updating existing addendum:", editingAddendum.id);
        addendumsActions.update({ id: editingAddendum.id, updates: addendumData });
      } else {
        console.log("Creating new addendum");
        console.log("Addendum data being added:", addendumData);
        console.log("addendumsActions.add function:", addendumsActions.add);
        console.log("Calling addendumsActions.add...");
        
        try {
          // Use direct action for immediate update
          const result = addendumsActions.add(addendumData);
          console.log("✅ Addendum added to store successfully:", result);
          console.log("✅ Addendum ID:", addendumData.id);
          console.log("✅ Parent Agreement ID:", addendumData.parentAgreementId);
        } catch (error) {
          console.error("❌ Error adding addendum to store:", error);
          setErrorModalMessage("Error adding addendum: " + error.message);
          setShowErrorModal(true);
          setIsSubmitting(false);
          return;
        }
      }
      
      console.log("Closing modal and resetting form...");
      uiActions.setShowAddendumForm(false);
      uiActions.setEditingAddendum(null);
      
      setForm({
        title: "", description: "", effectiveDate: new Date(), reason: "", impact: "",
        additionalDocuments: [], branches: []
      });
      setUploadedFiles({});
      setClauseModifications([]);
      setErrors({});
      setIsSubmitting(false);
      setIsEditMode(false);
      
      console.log("Addendum submission completed successfully!");
      
      console.log("=== ADDENDUM SUBMISSION COMPLETED SUCCESSFULLY ===");
      
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      setErrorModalMessage("Error: " + error.message);
      setShowErrorModal(true);
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (type, file) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only PDF, DOCX, JPG, JPEG, PNG allowed.');
      return;
    }

    if (file.size > maxSize) {
      alert('File size exceeds 10MB limit.');
      return;
    }

    setUploadedFiles(prev => ({
      ...prev,
      [type]: { file, uploaded: true, name: file.name }
    }));
  };

  const handleRemoveFile = (type) => {
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[type];
      return newFiles;
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCancel = () => {
    // Close the modal and navigate to agreements tab
    dispatch(setShowAddendumForm(false));
    dispatch(setEditingAddendum(null));
    dispatch(setActiveTab("agreements"));
  };

  return (
    <div 
      id="addendum-modal"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCancel();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {isEditMode ? "Edit Addendum" : "Create Addendum"}
            </h2>
            <button 
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {editingAddendum && (
            <p className="text-sm text-gray-600 mt-1">
              Parent Agreement: {editingAddendum.parentAgreementTitle} (ID: {editingAddendum.parentAgreementId})
            </p>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
      {/* Parent Agreement Info */}
          {editingAddendum && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">📋 Parent Agreement</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Client:</span> {editingAddendum.parentAgreementTitle}</div>
                <div><span className="font-medium">Branches:</span> {editingAddendum.parentAgreementBranches}</div>
                <div><span className="font-medium">Agreement ID:</span> {editingAddendum.parentAgreementId}</div>
                <div><span className="font-medium">Status:</span> {"Pending Review"}</div>
          </div>
        </div>
      )}

          {/* Addendum Details Section */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b border-gray-200 pb-2">Addendum Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter addendum title"
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Effective Date <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  selected={form.effectiveDate}
                  onChange={(date) => setForm(prev => ({ ...prev, effectiveDate: date }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  dateFormat="yyyy-MM-dd"
                  minDate={new Date()}
                />
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the addendum purpose and scope"
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Addendum <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Explain why this addendum is needed"
                />
                {errors.reason && <p className="text-red-500 text-sm mt-1">{errors.reason}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Impact <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="impact"
                  value={form.impact}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the business impact of this addendum"
                />
                {errors.impact && <p className="text-red-500 text-sm mt-1">{errors.impact}</p>}
              </div>
            </div>
          </section>

          {/* Branch Management Section - WITH PROPER SPACING */}
          <div className="mb-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Branches</h3>
            
            {/* Branch Selection Dropdown */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Branches <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                  <select
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a branch</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Chennai">Chennai</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Kolkata">Kolkata</option>
                    <option value="Pune">Pune</option>
                    <option value="Ahmedabad">Ahmedabad</option>
                    <option value="Jaipur">Jaipur</option>
                    <option value="Surat">Surat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newBranchDescription}
                    onChange={(e) => setNewBranchDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Enter branch description (optional)"
                  />
                </div>
              </div>
              <div className="flex justify-start mt-3">
                <button
                  type="button"
                  onClick={handleAddBranch}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  disabled={!newBranchName.trim()}
                >
                  Add Branch
                </button>
              </div>
            </div>
            
            {/* Current Branches Display */}
            {form.branches.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Selected Branches:</h4>
                <div className="space-y-3">
                  {form.branches.map((branch) => (
                    <div key={branch.id} className="bg-white p-4 rounded border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{branch.name}</div>
                          <div className="text-sm text-gray-600 mt-1">{branch.description}</div>
                          <div className="text-xs text-gray-500 mt-2">
                            Added: {branch.createdAt} • Status: {branch.status}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditBranch(branch.id)}
                            className="px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemoveBranch(branch.id)}
                            className="px-3 py-2 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {form.branches.length === 0 && (
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <p className="text-gray-500 text-sm italic text-center">
                  No branches selected yet. Use the dropdown above to add branches.
                </p>
              </div>
            )}
          </div>

          {/* Clause Modifications Section */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Clause Modifications</h2>
              <button
                type="button"
                onClick={handleOpenClauseModificationForm}
                className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                + Add Clause Change
              </button>
            </div>
            <p className="text-gray-500 mb-4">Track which clauses are being modified, added, or removed by this addendum</p>
            
            {/* Existing Clause Modifications Display */}
            {clauseModifications.length > 0 && (
              <div className="mb-4">
                <div className="space-y-3">
                  {clauseModifications.map((mod, index) => (
                    <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            mod.action === 'added' ? 'bg-green-100 text-green-700' :
                            mod.action === 'removed' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {mod.action}
                          </span>
                          <span className="font-medium text-gray-800">{mod.clause}</span>
                        </div>
                        <div className="flex gap-2">
                        <button
                            onClick={() => handleRemoveClauseModification(index)}
                            className="px-3 py-2 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                      </div>
                      <p className="text-sm text-gray-700 mt-2">{mod.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Document Uploads */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b border-gray-200 pb-2">Additional Documents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supporting Documents</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    onChange={(e) => e.target.files[0] && handleFileUpload('supporting', e.target.files[0])}
                    className="hidden"
                    id="supporting-upload"
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                  />
                  <label htmlFor="supporting-upload" className="cursor-pointer">
                    <div className="text-gray-400 mb-2">
                      <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">Click to upload supporting documents</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, DOCX, JPG, PNG up to 10MB</p>
                  </label>
            </div>
                {uploadedFiles.supporting && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-600">✓ {uploadedFiles.supporting.name}</span>
                    <button
                      onClick={() => handleRemoveFile('supporting')}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                )}
                    </div>
                    
                    <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amendment Documents</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                    type="file"
                    onChange={(e) => e.target.files[0] && handleFileUpload('amendment', e.target.files[0])}
                    className="hidden"
                    id="amendment-upload"
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                  />
                  <label htmlFor="amendment-upload" className="cursor-pointer">
                    <div className="text-gray-400 mb-2">
                      <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">Click to upload amendment documents</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, DOCX, JPG, PNG up to 10MB</p>
                  </label>
                  </div>
                {uploadedFiles.amendment && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-600">✓ {uploadedFiles.amendment.name}</span>
                    <button
                      onClick={() => handleRemoveFile('amendment')}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
                </div>
                
        {/* Fixed Footer */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            <button
              type="button"
              className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={(e) => {
                console.log("Submit button clicked");
                e.preventDefault();
                e.stopPropagation();
                handleSubmit();
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : (isEditMode ? 'Update Addendum' : 'Submit Addendum')}
            </button>
        </div>
      </div>

      {/* Clause Modification Modal */}
      {showClauseModificationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-blue-600">📝</span>
              Add New Clause Modification
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clause Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={clauseForm.clause}
                  onChange={(e) => {
                    console.log("Clause title changed to:", e.target.value);
                    setClauseForm(prev => ({ ...prev, clause: e.target.value }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Payment Terms, SLA, Insurance"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action <span className="text-red-500">*</span>
                </label>
                <select
                  value={clauseForm.action}
                  onChange={(e) => setClauseForm(prev => ({ ...prev, action: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select action</option>
                  <option value="added">Added</option>
                  <option value="removed">Removed</option>
                  <option value="modified">Modified</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={clauseForm.description}
                  onChange={(e) => {
                    console.log("Description changed to:", e.target.value);
                    setClauseForm(prev => ({ ...prev, description: e.target.value }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe the specific changes or new clause details..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCancelClauseModification}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClauseModification}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Modification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <div className="bg-white p-8 rounded shadow-xl flex flex-col items-center">
            <div className="text-2xl font-bold mb-2 text-red-700">Submission Error</div>
            <div className="mb-4 text-gray-700">{errorModalMessage}</div>
            <button
              className="mt-2 px-6 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700"
              onClick={() => setShowErrorModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddendumForm;
