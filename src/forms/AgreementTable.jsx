import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAppState } from "../hooks/useRedux";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-semibold mb-2">Something went wrong</h3>
          <p className="text-red-600 text-sm mb-2">
            An error occurred while rendering this component.
          </p>
          <details className="text-xs text-red-500">
            <summary>Error details</summary>
            <pre className="mt-2 whitespace-pre-wrap">
              {this.state.error?.toString()}
            </pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const priorityBadge = priority => {
  if (priority === "High") return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">High</span>;
  if (priority === "Medium") return <span className="bg-black text-white px-2 py-1 rounded-full text-xs font-bold">Medium</span>;
  if (priority === "Low") return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">Low</span>;
  return null;
};

// Component to render clickable file links
const FileLink = ({ file, label, type }) => {
  if (!file) return <span className="text-gray-400 text-xs">{label}: Not uploaded</span>;
   
  const handleFileClick = () => {
    try {
      // Check if it's a real File object or demo data
      if (file instanceof File) {
        // Real file - create object URL
      const url = URL.createObjectURL(file);
      window.open(url, '_blank');
      } else if (file.name && file.size) {
        // Demo data - show file info
        alert(`Demo File: ${file.name}\nSize: ${file.size}\nType: ${type}\n\nThis is demo data. In a real application, this would open the actual file.`);
      } else {
        alert('File information not available');
      }
    } catch (error) {
      console.error('Error opening file:', error);
      alert('Unable to open file');
    }
  };

  return (
    <span
      onClick={handleFileClick}
      className="text-blue-600 hover:text-blue-800 underline text-xs font-medium cursor-pointer transition-colors"
      title={`Click to view ${file.name || label} in new tab`}
    >
      {label}
    </span>
  );
};

// Component to render multiple file links in a column
const DocumentLinks = ({ uploadStatuses, documents }) => {
  return (
    <div className="flex flex-col gap-1">
      {documents.map(doc => {
        const isUploaded = uploadStatuses[doc.type]?.uploaded;
        const file = uploadStatuses[doc.type]?.file;
        
        return (
        <div key={doc.type}>
            {isUploaded && file ? (
          <FileLink 
                file={file} 
            label={doc.label} 
            type={doc.type}
          />
            ) : (
              <span className="text-gray-400 text-xs">
                {doc.label}: Not uploaded
              </span>
            )}
        </div>
        );
      })}
    </div>
  );
};

// Component to render clause document links with addendum modification indicators
const ClauseLinks = ({ clauses, uploadStatuses, addendums = [], agreementId, onShowClauseHistory }) => {
  // Get all addendums for this agreement
  const agreementAddendums = (addendums || []).filter(addendum => 
    addendum.parentAgreementId === agreementId
  );

  // Create a map of clause modifications by clause index
  const clauseModifications = {};
  agreementAddendums.forEach(addendum => {
    if (addendum.clauseModifications) {
      addendum.clauseModifications.forEach(mod => {
        const clauseIndex = parseInt(mod.clauseNumber) - 1; // Convert to 0-based index
        if (!clauseModifications[clauseIndex]) {
          clauseModifications[clauseIndex] = [];
        }
        clauseModifications[clauseIndex].push({
          ...mod,
          addendumId: addendum.id,
          addendumTitle: addendum.title,
          addendumStatus: addendum.status,
          addendumDate: addendum.submittedDate
        });
      });
    }
  });

  const clauseLinks = clauses
    .map((clause, index) => ({
      title: clause.title,
      file: uploadStatuses[`clause-${index}`]?.file,
      index,
      modifications: clauseModifications[index] || []
    }))
    .filter(clause => clause.file); // Only show clauses with uploaded files

  if (clauseLinks.length === 0) {
    return <span className="text-gray-400 text-xs">No documents uploaded</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {clauseLinks.map(clause => (
        <div key={clause.index} className="relative group">
          <div className="flex items-center gap-2">
            <FileLink 
              file={clause.file} 
              label={clause.title.length > 20 ? `${clause.title.substring(0, 20)}...` : clause.title}
              type={`clause-${clause.index}`}
            />
            
            {/* Addendum Modification Badges */}
            {clause.modifications.length > 0 && (
              <div className="flex items-center gap-1">
                {clause.modifications.map((mod, modIndex) => (
                  <div key={modIndex} className="relative">
                    <span 
                      className={`px-2 py-1 rounded-full text-xs font-medium cursor-help ${
                        mod.modificationType === "Modified" ? "bg-orange-100 text-orange-700 border border-orange-200" :
                        mod.modificationType === "Added" ? "bg-green-100 text-green-700 border border-green-200" :
                        mod.modificationType === "Removed" ? "bg-red-100 text-red-700 border border-red-200" :
                        "bg-blue-100 text-blue-700 border border-blue-200"
                      }`}
                      title={`${mod.modificationType} by Addendum #${mod.addendumId}`}
                    >
                      {mod.modificationType === "Modified" ? "🔄 Modified" :
                       mod.modificationType === "Added" ? "➕ New" :
                       mod.modificationType === "Removed" ? "❌ Removed" :
                       "📝 Changed"}
                    </span>
                    
                    {/* Hover Tooltip with Detailed Information */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 min-w-[200px]">
                      <div className="text-center mb-2 font-medium">
                        {mod.modificationType} Clause
                      </div>
                      <div className="space-y-1 text-left">
                        <div><strong>Addendum:</strong> #{mod.addendumId}</div>
                        <div><strong>Title:</strong> {mod.addendumTitle}</div>
                        <div><strong>Status:</strong> {mod.addendumStatus}</div>
                        <div><strong>Date:</strong> {new Date(mod.addendumDate).toLocaleDateString()}</div>
                        <div><strong>Details:</strong> {mod.details}</div>
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                ))}
                
                {/* View History Button */}
                <button
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 cursor-pointer transition-colors"
                  title="View clause history"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Show clause history modal or expand details
                    onShowClauseHistory(clause.index, clause.title, clause.modifications);
                  }}
                >
                  📋
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Final Agreement Upload Modal Component
const FinalAgreementUpload = ({ agreementId, onUpload, onCancel }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Only PDF, DOCX, JPG, JPEG, PNG allowed.');
      return;
    }

    if (file.size > maxSize) {
      setUploadError('File size exceeds 10MB limit.');
      return;
    }

    setUploadError("");
    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) {
      setUploadError("Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    // Simulate upload process
    setTimeout(() => {
      onUpload(agreementId, selectedFile);
      setIsUploading(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[400px] max-w-lg">
        <h3 className="text-xl font-bold mb-4">📄 Upload Final Signed Agreement</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Final Agreement Document
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50">
            <span className="text-4xl mb-2" role="img" aria-label="upload">📄</span>
            <label className="bg-blue-600 text-white px-4 py-2 rounded mb-2 font-medium cursor-pointer hover:bg-blue-700">
              Choose Final Agreement
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
            </label>
            <p className="text-xs text-gray-500 text-center">
              PDF, DOCX, JPG, JPEG, PNG (Max 10MB)
            </p>
          </div>
        </div>

        {selectedFile && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-sm font-medium text-green-800">
                Selected: {selectedFile.name}
              </span>
            </div>
          </div>
        )}

        {uploadError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-600">{uploadError}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isUploading ? "Uploading..." : "Upload & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};



// Status History Modal
function StatusHistoryModal({ open, onClose, history, title }) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[500px] max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>
        
        {history.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No status history available yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    entry.status === "Execution Pending" ? "bg-yellow-100 text-yellow-700" :
                    entry.status === "Executed" ? "bg-blue-100 text-blue-700" :
                    entry.status === "Under Process with Client" ? "bg-purple-100 text-purple-700" :
                    entry.status === "Approved" ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {entry.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                {entry.notes && (
                  <p className="text-sm text-gray-700 mb-2">{entry.notes}</p>
                )}
                {entry.date && (
                  <p className="text-xs text-gray-500">Date: {entry.date}</p>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Agreement Details Modal with Actions - Matching Live Site UI
function DetailsModal({ open, onClose, agreement, onPriorityChange, onStatusChange, onFinalAgreementUpload, addendums = [], userRole = "checker", onAddendumStatusUpdate, pendingStatusChanges, setPendingStatusChanges }) {
  // Debug modal state
  console.log("=== DETAILS MODAL FUNCTION CALLED ===");
  console.log("open:", open);
  console.log("agreement:", agreement);
  
  // Debug agreement data
  console.log("=== DETAILS MODAL DEBUG ===");
  console.log("agreement:", agreement);
  console.log("agreement.originalAgreement:", agreement?.originalAgreement);
  console.log("agreement.originalAgreement?.contactInfo:", agreement?.originalAgreement?.contactInfo);
  console.log("agreement.contactInfo:", agreement?.contactInfo);
  
  const [localPriority, setLocalPriority] = useState(agreement?.originalAgreement?.priority || "Low");
  const [localStatus, setLocalStatus] = useState(agreement?.originalStatus || agreement?.status || "Execution Pending");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [currentTab, setCurrentTab] = useState("agreement"); // "agreement" or "addendums"
  const [currentAddendumIndex, setCurrentAddendumIndex] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showAddendumList, setShowAddendumList] = useState(false);

  React.useEffect(() => {
    if (agreement) {
      setLocalPriority(agreement.originalAgreement?.priority || "Low");
      setLocalStatus(agreement.originalStatus || agreement.status || "Execution Pending");
      setSelectedFile(null);
      setUploadError("");
      setCurrentTab("agreement"); // Reset to agreement tab when opening
      setCurrentAddendumIndex(0); // Reset addendum index
      setShowSuccessMessage(false); // Reset success message
    }
  }, [agreement]);

  if (!open) return null;

  // Debug: Log the agreement data structure
  console.log("=== DETAILS MODAL DEBUG ===");
  console.log("open:", open);
  console.log("agreement:", agreement);
  console.log("agreement?.originalAgreement:", agreement?.originalAgreement);
  console.log("agreement?.originalAgreement?.selectedBranches:", agreement?.originalAgreement?.selectedBranches);
  console.log("agreement?.originalAgreement?.contactInfo:", agreement?.originalAgreement?.contactInfo);
  console.log("agreement?.originalAgreement?.importantClauses:", agreement?.originalAgreement?.importantClauses);
  console.log("agreement?.originalAgreement?.importantClauses type:", typeof agreement?.originalAgreement?.importantClauses);
  console.log("agreement?.originalAgreement?.importantClauses isArray:", Array.isArray(agreement?.originalAgreement?.importantClauses));
  if (agreement?.originalAgreement?.importantClauses) {
    agreement.originalAgreement.importantClauses.forEach((clause, idx) => {
      console.log(`Clause ${idx}:`, clause, "type:", typeof clause);
    });
  }

  // Handle case where agreement is null or undefined
  if (!agreement) {
    console.error("DetailsModal: agreement is null or undefined");
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-lg p-6 min-w-[400px] max-w-lg">
          <div className="text-center">
            <h3 className="text-xl font-bold text-red-600 mb-4">Error</h3>
            <p className="text-gray-600 mb-4">Unable to load agreement details. The agreement data is missing.</p>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle case where originalAgreement is missing
  if (!agreement.originalAgreement) {
    console.error("DetailsModal: agreement.originalAgreement is missing");
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-lg p-6 min-w-[400px] max-w-lg">
          <div className="text-center">
            <h3 className="text-xl font-bold text-red-600 mb-4">Error</h3>
            <p className="text-gray-600 mb-4">Unable to load agreement details. The original agreement data is missing.</p>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get addendums for this agreement
  const agreementAddendums = (addendums || []).filter(addendum => 
    addendum.parentAgreementId === agreement.id
  );

  // Get current addendum for display
  const currentAddendum = agreementAddendums[currentAddendumIndex];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Only PDF, DOCX, JPG, JPEG, PNG allowed.');
      return;
    }

    if (file.size > maxSize) {
      setUploadError('File size exceeds 10MB limit.');
      return;
    }

    setUploadError("");
    setSelectedFile(file);
  };

  const handleApprove = () => {
    if (selectedFile) {
      setIsUploading(true);
      setTimeout(() => {
        onFinalAgreementUpload(agreement.id, selectedFile);
        onStatusChange(agreement.id, "Approved");
        setIsUploading(false);
        onClose();
      }, 1000);
    } else {
      // Move to next status in progression
      const currentStatus = agreement.status || "Execution Pending";
      let nextStatus = "Execution Pending";
      
      if (currentStatus === "Execution Pending") {
        nextStatus = "Executed";
      } else if (currentStatus === "Executed") {
        nextStatus = "Under Process with Client";
      } else if (currentStatus === "Under Process with Client") {
        nextStatus = "Approved"; // Move to final status
      } else if (currentStatus === "Approved") {
        nextStatus = "Approved"; // Stay at final status
      }
      
      onStatusChange(agreement.id, nextStatus);
      onClose();
    }
  };

  const handleReject = () => {
    // Reset to Execution Pending on reject
    onStatusChange(agreement.id, "Execution Pending");
    onClose();
  };

  const handleSaveChanges = () => {
    // Show immediate visual feedback
    setShowSuccessMessage(true);
    
    // Save the changes
    onPriorityChange(agreement.id, localPriority);
    onStatusChange(agreement.id, localStatus);
    
    // Show a quick alert as backup confirmation
    setTimeout(() => {
      alert("✅ Changes saved successfully!");
    }, 100);
    
    // Keep message visible for 5 seconds
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 5000);
  };

  try {
    console.log("DetailsModal: Starting to render modal content");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[600px] max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Agreements
            </button>
          <h3 className="text-xl font-bold">Contract Details - {agreement.id}</h3>
          </div>
        </div>

        {/* Success Message - Very Prominent */}
        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-green-500 text-white rounded-lg shadow-lg border-2 border-green-600 flex items-center justify-center gap-3 animate-pulse">
            <span className="text-2xl">✅</span>
            <span className="text-xl font-bold">CHANGES SAVED SUCCESSFULLY!</span>
            <span className="text-2xl">✅</span>
          </div>
        )}
        
        {/* Page Navigation */}
        <div className="flex items-center justify-between border-b border-gray-200 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentTab("agreement")}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                currentTab === "agreement"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Agreement Details
            </button>
            <button
              onClick={() => setCurrentTab("addendums")}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                currentTab === "addendums"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              📄 Addendums ({agreementAddendums.length})
            </button>
          </div>
          
          {/* Navigation Buttons */}
            <div className="flex gap-2">
              <button
              onClick={() => {
                if (currentTab === "addendums") {
                  // In addendums tab, go back to agreement details
                  setCurrentTab("agreement");
                } else {
                  // In agreement details tab, go to previous addendum
                  setCurrentAddendumIndex(Math.max(0, currentAddendumIndex - 1));
                }
              }}
              disabled={agreementAddendums.length === 0 || (currentTab === "agreement" && currentAddendumIndex === 0)}
              className={`px-3 py-1 text-sm rounded ${
                agreementAddendums.length === 0 || (currentTab === "agreement" && currentAddendumIndex === 0)
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                }`}
              >
                ← Previous
              </button>
              <button
              onClick={() => {
                if (currentTab === "agreement") {
                  // In agreement details tab, go to addendums tab
                  setCurrentTab("addendums");
                } else {
                  // In addendums tab, go to next addendum
                  setCurrentAddendumIndex(Math.min(agreementAddendums.length - 1, currentAddendumIndex + 1));
                }
              }}
              disabled={agreementAddendums.length === 0 || (currentTab === "addendums" && currentAddendumIndex === agreementAddendums.length - 1)}
              className={`px-3 py-1 text-sm rounded ${
                agreementAddendums.length === 0 || (currentTab === "addendums" && currentAddendumIndex === agreementAddendums.length - 1)
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                }`}
              >
                Next →
              </button>
            </div>
        </div>

        {/* Page Content */}
        {currentTab === "agreement" && (
          <>
            <p className="text-gray-600 text-sm mb-6">Review and approve the agreement</p>

            {/* Agreement Information */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div><b>Client:</b><br/>{agreement.originalAgreement?.selectedClient || agreement.selectedClient || "Not specified"}</div>
              <div><b>Site:</b><br/>{(() => {
                const branches = agreement.originalAgreement?.selectedBranches || agreement.selectedBranches;
                if (branches && Array.isArray(branches)) {
                  return branches.map(branch => typeof branch === 'string' ? branch : (branch.name || branch)).join(", ");
                }
                return "Not specified";
              })()}</div>
              <div><b>Department:</b><br/>{agreement.originalAgreement?.selectedDepartment || agreement.selectedDepartment || "Not specified"}</div>
              <div><b>Entity Type:</b><br/>{agreement.originalAgreement?.entityType || agreement.entityType || "Not specified"}</div>
              <div><b>Checker:</b><br/>{agreement.originalAgreement?.submittedBy || agreement.submittedBy || "Not specified"}</div>
              <div><b>Agreement Type:</b><br/>{agreement.originalAgreement?.agreementType || agreement.agreementType || "Not specified"}</div>
              <div><b>Start Date:</b><br/>{agreement.originalAgreement?.startDate || agreement.startDate || "Not specified"}</div>
              <div><b>End Date:</b><br/>{agreement.originalAgreement?.endDate || agreement.endDate || "Not specified"}</div>
              <div><b>Total Value:</b><br/>{(() => {
                const totalValue = agreement.originalAgreement?.totalValue || agreement.totalValue;
                const currency = agreement.originalAgreement?.currency || agreement.currency || "USD";
                return totalValue ? `${currency} ${totalValue.toLocaleString()}` : "Not specified";
              })()}</div>
              <div><b>Submitted Date:</b><br/>{(() => {
                const submittedDate = agreement.originalAgreement?.submittedDate || agreement.submittedDate;
                return submittedDate ? new Date(submittedDate).toLocaleDateString() : "Not specified";
              })()}</div>
              <div><b>Priority:</b><br/>{agreement.originalAgreement?.priority || agreement.priority || "Not set"}</div>
              <div><b>Status:</b><br/>{agreement.originalStatus || agreement.status || "Not set"}</div>
            </div>

            {/* Contact Information Section */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">📞 Contact Information</h4>
              <div className="grid grid-cols-2 gap-6">
                {/* I Smart Contact */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h5 className="font-medium text-blue-800 mb-3">I Smart Contact</h5>
                  <div className="space-y-2 text-sm">
                    <div><b>Name:</b> {agreement.originalAgreement?.contactInfo?.name || agreement.contactInfo?.name || "Not specified"}</div>
                    <div><b>Phone:</b> {agreement.originalAgreement?.contactInfo?.phone || agreement.contactInfo?.phone || "Not specified"}</div>
                    <div><b>Email:</b> {agreement.originalAgreement?.contactInfo?.email || agreement.contactInfo?.email || "Not specified"}</div>
                  </div>
                </div>
                {/* Client Contact */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h5 className="font-medium text-green-800 mb-3">Client Contact</h5>
                  <div className="space-y-2 text-sm">
                    <div><b>Name:</b> {agreement.originalAgreement?.contactInfo?.clientName || agreement.contactInfo?.clientName || "Not specified"}</div>
                    <div><b>Phone:</b> {agreement.originalAgreement?.contactInfo?.clientPhone || agreement.contactInfo?.clientPhone || "Not specified"}</div>
                    <div><b>Email:</b> {agreement.originalAgreement?.contactInfo?.clientEmail || agreement.contactInfo?.clientEmail || "Not specified"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Uploaded Documents</h4>
              <div className="space-y-3">
                {agreement.originalAgreement?.uploadStatuses ? (
                  Object.entries(agreement.originalAgreement.uploadStatuses).map(([docType, status]) => (
                    <div key={docType} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600">📄</span>
                        <span className="font-medium text-gray-800">{docType}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          status.uploaded ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {status.uploaded ? "✓ Uploaded" : "✗ Missing"}
                        </span>
                      </div>
                      {status.uploaded && status.file && (
                        <span className="text-sm text-gray-600">{status.file.name}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm">No document information available</span>
                )}
              </div>
            </div>

            {/* Important Clauses Section */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Important Clauses</h4>
              <div className="space-y-2">
                {(() => {
                  // Check both importantClauses and clauses fields with fallbacks
                  const importantClauses = agreement.originalAgreement?.importantClauses || agreement.importantClauses;
                  const clauses = agreement.originalAgreement?.clauses || agreement.clauses;
                  const uploadStatuses = agreement.originalAgreement?.uploadStatuses || agreement.uploadStatuses;
                  
                  // Combine both clause types
                  const allClauses = [];
                  
                  if (importantClauses && Array.isArray(importantClauses)) {
                    console.log("=== DETAILS MODAL - PROCESSING IMPORTANT CLAUSES ===");
                    console.log("Processing importantClauses:", importantClauses);
                    console.log("Important clauses length:", importantClauses.length);
                    importantClauses.forEach((clause, idx) => {
                      console.log(`Processing clause ${idx}:`, clause, "type:", typeof clause);
                      
                      // Check if clause has uploaded documents
                      let hasDocuments = false;
                      
                      if (typeof clause === 'string') {
                        // For string clauses, only show if they have been specifically marked as having documents
                        // This would require the clause to have a 'hasDocument' property or similar
                        hasDocuments = false;
                      } else if (clause && clause.title) {
                        // For object clauses, check if they have documents array (demo data) or file property (new agreements)
                        hasDocuments = (clause.documents && Array.isArray(clause.documents) && clause.documents.length > 0) ||
                                       (clause.file && clause.file !== null);
                      }
                      
                      // Only add clauses that have uploaded documents
                      if (hasDocuments) {
                        if (typeof clause === 'string') {
                          allClauses.push({ title: clause, type: 'important' });
                        } else if (clause && clause.title) {
                          allClauses.push({ ...clause, type: 'important' });
                        }
                      }
                    });
                  }
                  
                  if (clauses && Array.isArray(clauses)) {
                    console.log("Processing clauses:", clauses);
                    clauses.forEach((clause, idx) => {
                      console.log(`Processing regular clause ${idx}:`, clause, "type:", typeof clause);
                      
                      // Check if clause has uploaded documents
                      let hasDocuments = false;
                      
                      if (typeof clause === 'string') {
                        // For string clauses, only show if they have been specifically marked as having documents
                        // This would require the clause to have a 'hasDocument' property or similar
                        hasDocuments = false;
                      } else if (clause && clause.title) {
                        // For object clauses, check if they have documents array (demo data) or file property (new agreements)
                        hasDocuments = (clause.documents && Array.isArray(clause.documents) && clause.documents.length > 0) ||
                                       (clause.file && clause.file !== null);
                      }
                      
                      // Only add clauses that have uploaded documents
                      if (hasDocuments) {
                        if (typeof clause === 'string') {
                          allClauses.push({ title: clause, type: 'regular' });
                        } else if (clause && clause.title) {
                          allClauses.push({ ...clause, type: 'regular' });
                        }
                      }
                    });
                  }
                  
                  console.log("=== DETAILS MODAL - FILTERING RESULT ===");
                  console.log("All clauses after filtering:", allClauses);
                  console.log("All clauses length:", allClauses.length);
                  
                  // Check if there are any uploaded documents at all
                  const hasAnyUploadedDocuments = uploadStatuses && Object.keys(uploadStatuses).some(docType => 
                    uploadStatuses[docType]?.uploaded
                  );
                  
                  console.log("Has any uploaded documents:", hasAnyUploadedDocuments);
                  console.log("Upload statuses:", uploadStatuses);
                  
                  if (allClauses.length === 0 || !hasAnyUploadedDocuments) {
                    return <span className="text-gray-500 text-sm">No clauses with documents uploaded</span>;
                  }
                  
                  return allClauses.map((clause, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-blue-50 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors"
                           onClick={() => {
                             const clauseTitle = clause.title;
                             
                             // Check if clause has documents to open
                             if (clause.documents && Array.isArray(clause.documents) && clause.documents.length > 0) {
                               // Open the first document (demo data)
                               const firstDoc = clause.documents[0];
                               alert(`Opening document: ${firstDoc.name}\nSize: ${firstDoc.size}\nType: ${firstDoc.type}\n\nThis is demo data. In a real application, this would open the actual document.`);
                             } else if (clause.file && clause.file !== null) {
                               // Open the clause file (new agreements)
                               alert(`Opening document: ${clause.file.name}\nSize: ${clause.file.size}\nType: ${clause.file.type}\n\nThis is demo data. In a real application, this would open the actual document.`);
                             } else {
                               // For string clauses, check if there's a corresponding file upload
                               const clauseName = clauseTitle.toLowerCase();
                               const matchingDocType = Object.keys(uploadStatuses || {}).find(docType => 
                                 uploadStatuses[docType]?.uploaded && 
                                 docType.toLowerCase().includes(clauseName.split(' ')[0].toLowerCase())
                               );
                               
                               if (matchingDocType && uploadStatuses[matchingDocType].file) {
                                 const file = uploadStatuses[matchingDocType].file;
                                 alert(`Opening document: ${file.name}\nSize: ${file.size}\nType: ${matchingDocType}\n\nThis is demo data. In a real application, this would open the actual document.`);
                               } else {
                                 alert(`Clause: ${clauseTitle}\n\nNo document uploaded for this clause.`);
                               }
                             }
                           }}>
                        <span className="text-blue-600">📋</span>
                      <div className="flex-1">
                        <span className="text-gray-800 text-sm font-medium">{clause.title}</span>
                        {clause.placeholder && (
                          <div className="text-gray-600 text-xs mt-1">{clause.placeholder}</div>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Priority and Status Controls */}
            {/* Priority and Status - Only for Approver Role */}
            {userRole?.toLowerCase() === "approver" && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={localPriority}
                    onChange={(e) => setLocalPriority(e.target.value)}
                    className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={localStatus}
                    onChange={(e) => setLocalStatus(e.target.value)}
                    className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="Execution Pending">Execution Pending</option>
                    <option value="Executed">Executed</option>
                    <option value="Under Process with Client">Under Process with Client</option>
                    <option value="Approved">Approved</option>
                  </select>
                </div>
              </div>
            )}

            {/* Status Display for Checker Role */}
            {userRole?.toLowerCase() === "checker" && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <div className="w-full border rounded-md p-2 text-sm bg-gray-100 text-gray-600">
                    {agreement.priority || "Not Set"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="w-full border rounded-md p-2 text-sm bg-gray-100 text-gray-600">
                    {agreement.status || "Not Set"}
                  </div>
                </div>
              </div>
            )}

            {/* Upload Final Agreement - Only for Approver Role */}
            {userRole?.toLowerCase() === "approver" && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Final Agreement *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50">
                  <span className="text-4xl mb-2">📄</span>
                  <label className="bg-black text-white px-4 py-2 rounded mb-2 font-medium cursor-pointer hover:bg-gray-800">
                    Choose File
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="text-xs text-gray-500 text-center">
                    or drag and drop your file here<br/>
                    Max size: 10MB • Allowed: .pdf,.docx,.jpg,.jpeg,.png
                  </p>
                </div>

                {selectedFile && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm font-medium text-green-800">
                        Selected: {selectedFile.name}
                      </span>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-600">{uploadError}</p>
                  </div>
                )}
              </div>
            )}

            {/* Final Agreement Display for Checker Role */}
            {userRole?.toLowerCase() === "checker" && agreement.finalAgreement && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Final Agreement Document</label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <div>
                      <p className="font-medium text-gray-800">{agreement.finalAgreement.name}</p>
                      <p className="text-sm text-gray-600">Uploaded by approver</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons - Only for Approver Role */}
            {userRole?.toLowerCase() === "approver" && (
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleSaveChanges}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg shadow-lg border-2 border-green-700"
                >
                  💾 Save Changes
                </button>
              </div>
            )}
            
            {/* Debug info for button visibility */}
            {userRole?.toLowerCase() === "approver" && (
              <div className="mt-2 text-xs text-gray-500 text-center">
                ✅ Save Changes button is visible for Approver role
              </div>
            )}
            
            {userRole?.toLowerCase() !== "approver" && (
              <div className="mt-2 text-xs text-red-500 text-center">
                ❌ Save Changes button is hidden for {userRole} role. Switch to Approver role to see it.
              </div>
            )}

            {/* Read-only Message for Checker Role */}
            {userRole?.toLowerCase() === "checker" && (
              <div className="text-center py-4 text-gray-600 bg-gray-50 rounded-lg border">
                <p className="text-sm">📋 You can view agreement details and addendums, but only approvers can modify status and priority.</p>
              </div>
            )}
          </>
        )}

        {currentTab === "addendums" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-gray-600 text-sm">View all addendums and modifications for this contract</p>
                <p className="text-xs text-green-600 mt-1">
                  ✅ Addendums are separate modifications that do not affect the original contract
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {agreementAddendums.length} addendum{agreementAddendums.length !== 1 ? 's' : ''} total
                </span>
                <button
                  onClick={() => setShowAddendumList(!showAddendumList)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
                >
                  {showAddendumList ? 'Hide List' : 'Show All'}
                </button>
              </div>
            </div>
            
            {agreementAddendums.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl mb-2 block">📄</span>
                <p className="text-lg font-medium">No addendums found</p>
                <p className="text-sm">This contract has no addendums or modifications yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Addendum List View */}
                {showAddendumList && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">📄 Contract Modifications</h3>
                    <div className="space-y-3">
                      {agreementAddendums.map((addendum, index) => (
                        <div
                          key={addendum.id}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            currentAddendumIndex === index
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                          onClick={() => setCurrentAddendumIndex(index)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-blue-600">#{addendum.id}</span>
                              <span className="text-sm font-medium text-gray-800">
                                {typeof addendum.title === 'string' ? addendum.title : 'Untitled Addendum'}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                addendum.status === "Approved" ? "bg-green-100 text-green-700" :
                                addendum.status === "Rejected" ? "bg-red-100 text-red-700" :
                                addendum.status === "Under Review" ? "bg-blue-100 text-blue-700" :
                                "bg-yellow-100 text-yellow-700"
                              }`}>
                                {addendum.status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              📅 {new Date(addendum.submittedDate).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-600">Created by:</span>
                              <span className="ml-2 text-gray-800">👤 {addendum.submittedBy}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Effective Date:</span>
                              <span className="ml-2 text-gray-800">
                                {addendum.effectiveDate ? new Date(addendum.effectiveDate).toLocaleDateString() : "Not specified"}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium text-gray-600">Summary:</span>
                            <span className="ml-2">
                              {typeof addendum.description === 'string' 
                                ? addendum.description.substring(0, 120) + '...'
                                : 'No description available'}
                            </span>
                          </div>
                          
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {addendum.clauseModifications?.length || 0} clause modifications
                              </span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-500">
                                {Object.keys(addendum.uploadedFiles || {}).length} documents
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Quick download
                                  const addendumDoc = `Addendum ${addendum.id}: ${addendum.title}\nStatus: ${addendum.status}\nDate: ${new Date(addendum.submittedDate).toLocaleDateString()}\nSummary: ${addendum.description}`;
                                  const blob = new Blob([addendumDoc], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `Addendum_${addendum.id}.txt`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                📥 Quick Download
                              </button>
                              
                              {/* Edit Addendum Button - Only for Checker role */}
                              {userRole === "checker" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditAddendum(addendum);
                                  }}
                                  className="text-xs text-orange-600 hover:text-orange-800 underline"
                                  title="Edit this addendum"
                                >
                                  ✏️ Edit
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Addendum Display */}
                {agreementAddendums[currentAddendumIndex] && (
                  <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
                    {(() => {
                      const addendum = agreementAddendums[currentAddendumIndex];
                      return (
                  <div key={addendum.id} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                    {/* Header Section */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-xl text-blue-600">#{addendum.id}</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          (pendingStatusChanges[addendum.id] || addendum.status) === "Approved" ? "bg-green-100 text-green-700" :
                          (pendingStatusChanges[addendum.id] || addendum.status) === "Rejected" ? "bg-red-100 text-red-700" :
                          (pendingStatusChanges[addendum.id] || addendum.status) === "Under Review" ? "bg-blue-100 text-blue-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {pendingStatusChanges[addendum.id] || addendum.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        📅 {new Date(addendum.submittedDate).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {/* Basic Information */}
                    <div className="grid grid-cols-2 gap-6 mb-4 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">Title:</span>
                        <p className="text-gray-800 mt-1">{addendum.title}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Submitted By:</span>
                        <p className="text-gray-800 mt-1">👤 {addendum.submittedBy}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Effective Date:</span>
                        <p className="text-gray-800 mt-1">{addendum.effectiveDate ? new Date(addendum.effectiveDate).toLocaleDateString() : "Not specified"}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Reason:</span>
                        <p className="text-gray-800 mt-1">{addendum.reason || "Not specified"}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Impact Assessment:</span>
                        <p className="text-gray-800 mt-1">{addendum.impact || "Not specified"}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Branches:</span>
                        <p className="text-gray-800 mt-1">{addendum.branches && Array.isArray(addendum.branches) ? addendum.branches.join(", ") : "All Branches"}</p>
                      </div>
                    </div>
                    
                    {/* Summary of Changes */}
                    <div className="mb-4">
                      <span className="font-semibold text-gray-700 text-sm">Summary of Changes:</span>
                      <p className="text-gray-800 mt-1 text-sm leading-relaxed">{addendum.description}</p>
                    </div>
                    
                    {/* Clause Modifications */}
                    {addendum.clauseModifications && Array.isArray(addendum.clauseModifications) && addendum.clauseModifications.length > 0 && (
                      <div className="mb-4">
                        <span className="font-semibold text-gray-700 text-sm">Clause Modifications:</span>
                        <div className="mt-2 space-y-2">
                          {addendum.clauseModifications.map((mod, modIndex) => (
                            <div key={modIndex} className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-400">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-800 text-sm">Clause {mod.clauseNumber}: {mod.details}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  mod.modificationType === "Modified" ? "bg-orange-100 text-orange-700" :
                                  mod.modificationType === "New" ? "bg-green-100 text-green-700" :
                                  mod.modificationType === "Removed" ? "bg-red-100 text-red-700" :
                                  "bg-blue-100 text-blue-700"
                                }`}>
                                  {mod.modificationType === "Modified" ? "🔄 Modified" :
                                   mod.modificationType === "New" ? "➕ New" :
                                   mod.modificationType === "Removed" ? "❌ Removed" :
                                   "📝 Changed"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Documents Section */}
                    {addendum.uploadedFiles && Object.keys(addendum.uploadedFiles).length > 0 && (
                      <div className="mb-4">
                        <span className="font-semibold text-gray-700 text-sm">Documents:</span>
                        <div className="mt-2 space-y-2">
                          {Object.entries(addendum.uploadedFiles).map(([key, file]) => (
                            <div key={key} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                              <div className="flex items-center gap-3">
                                <span className="text-gray-600 text-sm font-medium">{key}:</span>
                                <span className="text-gray-800 text-sm">{file.name}</span>
                              </div>
                              <span
                                onClick={() => {
                                  if (file.isDemo) {
                                    alert("This is a demo file and cannot be opened.");
                                  } else if (file.url) {
                                    window.open(file.url, '_blank');
                                  } else if (file instanceof File) {
                                    const url = URL.createObjectURL(file);
                                    window.open(url, '_blank');
                                  }
                                }}
                                className={`text-sm cursor-pointer transition-colors font-medium ${
                                  file.isDemo 
                                    ? 'text-gray-400 cursor-not-allowed' 
                                    : 'text-blue-600 hover:text-blue-800 underline'
                                }`}
                                title={file.isDemo ? 'Demo file - cannot be opened' : 'Click to open in new tab'}
                              >
                                {file.isDemo ? 'Demo File' : 'Open Document'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Change Status Section - Only for Approver Role */}
                    {userRole?.toLowerCase() === "approver" && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">Change Status</h4>
                        
                        {/* Status Dropdown */}
                        <div className="mb-3">
                          <select
                            value={pendingStatusChanges[addendum.id] || addendum.status || "Pending Review"}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              setPendingStatusChanges(prev => ({
                                ...prev,
                                [addendum.id]: newStatus
                              }));
                              
                              // Automatically update the addendum status
                              if (onAddendumStatusUpdate) {
                                onAddendumStatusUpdate(addendum.id, newStatus);
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            <option value="Pending Review">⏳ Pending Review</option>
                            <option value="Under Review">👀 Under Review</option>
                            <option value="Approved">✅ Approved</option>
                            <option value="Rejected">❌ Rejected</option>
                          </select>
                        </div>

                        {/* Current Status Display */}
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-700">Current Status: </span>
                          <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                            (pendingStatusChanges[addendum.id] || addendum.status) === "Approved" ? "bg-green-100 text-green-700" :
                            (pendingStatusChanges[addendum.id] || addendum.status) === "Rejected" ? "bg-red-100 text-red-700" :
                            (pendingStatusChanges[addendum.id] || addendum.status) === "Under Review" ? "bg-blue-100 text-blue-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {pendingStatusChanges[addendum.id] || addendum.status || "Pending Review"}
                          </span>
                        </div>

                        {/* Instruction Box */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                          <div className="flex items-start gap-2">
                            <span className="text-yellow-500 text-sm">💡</span>
                            <p className="text-xs text-blue-800">
                              Select a new status from the dropdown above to change the addendum status.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between pt-4 border-t border-gray-200">
                      <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
                      >
                        Close
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            // Generate and download addendum document
                            const addendumDoc = `
ADDENDUM DOCUMENT
================

Addendum ID: ${addendum.id}
Title: ${addendum.title}
Status: ${addendum.status}
Submitted By: ${addendum.submittedBy}
Submitted Date: ${new Date(addendum.submittedDate).toLocaleDateString()}
Effective Date: ${addendum.effectiveDate ? new Date(addendum.effectiveDate).toLocaleDateString() : 'Not specified'}

SUMMARY OF CHANGES:
${addendum.description}

REASON:
${addendum.reason || 'Not specified'}

IMPACT ASSESSMENT:
${addendum.impact || 'Not specified'}

BRANCHES AFFECTED:
${addendum.branches && Array.isArray(addendum.branches) ? addendum.branches.join(", ") : "All Branches"}

CLAUSE MODIFICATIONS:
${addendum.clauseModifications && Array.isArray(addendum.clauseModifications) ? 
  addendum.clauseModifications.map(mod => 
    `- Clause ${mod.clauseNumber}: ${mod.details} (${mod.modificationType})`
  ).join('\n') : 'No clause modifications'}

DOCUMENTS:
${addendum.uploadedFiles && Object.keys(addendum.uploadedFiles).length > 0 ? 
  Object.entries(addendum.uploadedFiles).map(([key, file]) => 
    `- ${key}: ${file.name}`
  ).join('\n') : 'No documents uploaded'}

---
Generated on: ${new Date().toLocaleString()}
                            `;
                            
                            const blob = new Blob([addendumDoc], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Addendum_${addendum.id}_${addendum.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                        >
                          <span>📥</span>
                          Download Document
                      </button>
                      <button
                        onClick={() => handleViewAddendum(addendum)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                      >
                        <span>👁️</span>
                        View Full Details
                      </button>
                      </div>
                    </div>
                  </div>
                      );
                    })()}
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
  } catch (error) {
    console.error("DetailsModal rendering error:", error);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-lg p-6 min-w-[400px] max-w-lg">
          <div className="text-center">
            <h3 className="text-xl font-bold text-red-600 mb-4">Error</h3>
            <p className="text-gray-600 mb-4">An error occurred while loading the agreement details.</p>
            <p className="text-sm text-gray-500 mb-4">Error: {error.message}</p>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Close
            </button>
          </div>
      </div>
    </div>
  );
  }
}

export default function AgreementTable({ agreements = [], onStatusUpdate, onAddendumStatusUpdate, userRole = "checker", onCreateAddendum, onEditAgreement, onAddendumSubmit }) {
  const { addendums } = useAppState();
  
  // Debug addendums from Redux
  console.log("=== AGREEMENT TABLE - REDUX ADDENDUMS ===");
  console.log("addendums from useAppState:", addendums);
  console.log("addendums.addendums:", addendums?.addendums);
  console.log("addendums length:", addendums?.addendums?.length);
  const [filters, setFilters] = useState({ 
    client: "", 
    city: "", 
    state: "", 
    fromDate: "", 
    toDate: "",
    addendumsFilter: "all" // "all", "with", "without"
  });
  const [showFinalUpload, setShowFinalUpload] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState({}); // State to track dropdown open/close for addendums
  const [addendumDetailsModal, setAddendumDetailsModal] = useState({ open: false, addendum: null }); // State for addendum details modal
  const [clauseHistoryModal, setClauseHistoryModal] = useState({ open: false, clause: null, modifications: [] }); // State for clause history modal
  const [editingAddendum, setEditingAddendum] = useState(null); // State for editing addendum
  const [isEditing, setIsEditing] = useState(false); // State to track if we're in edit mode
  const [pendingStatusChanges, setPendingStatusChanges] = useState({}); // Track pending status changes for each addendum
  const [topScrollRef, setTopScrollRef] = useState(null);
  const [bottomScrollRef, setBottomScrollRef] = useState(null);
  
  // Ref for dropdown container
  const dropdownRef = useRef(null);
  
  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Close all dropdowns
        setDropdownOpen({});
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Synchronize top and bottom scrollbars
  useEffect(() => {
    if (topScrollRef && bottomScrollRef) {
      const handleTopScroll = () => {
        bottomScrollRef.scrollLeft = topScrollRef.scrollLeft;
      };
      
      const handleBottomScroll = () => {
        topScrollRef.scrollLeft = bottomScrollRef.scrollLeft;
      };

      topScrollRef.addEventListener('scroll', handleTopScroll);
      bottomScrollRef.addEventListener('scroll', handleBottomScroll);

      return () => {
        topScrollRef.removeEventListener('scroll', handleTopScroll);
        bottomScrollRef.removeEventListener('scroll', handleBottomScroll);
      };
    }
  }, [topScrollRef, bottomScrollRef]);
  
  // Function to determine which status should be shown based on progression
  const getCurrentStatus = (agreement) => {
    // Default to "Execution Pending" if no status is set
    if (!agreement.status) {
      return "Execution Pending";
    }
    
    // If status is "Execution Pending", show only that
    if (agreement.status === "Execution Pending") {
      return "Execution Pending";
    }
    
    // If status is "Executed", show only that
    if (agreement.status === "Executed") {
      return "Executed";
    }
    
    // If status is "Under Process with Client", show only that
    if (agreement.status === "Under Process with Client") {
      return "Under Process with Client";
    }
    
    // If status is "Approved", show only that (final status)
    if (agreement.status === "Approved") {
      return "Approved";
    }
    
    // Default fallback
    return "Execution Pending";
  };
  


  // Debug agreements data
  console.log("=== AGREEMENT TABLE DEBUG ===");
  console.log("Total agreements from Redux:", agreements.length);
  console.log("Agreements data:", agreements);
  console.log("User role:", userRole);

  // Transform agreement data from form structure to table structure
  const transformedData = agreements.map((agreement, index) => {
    // Debug upload statuses
    console.log(`=== UPLOAD STATUS DEBUG for Agreement ${agreement.id} ===`);
    console.log("agreement.uploadStatuses:", agreement.uploadStatuses);
    console.log("WO uploaded:", agreement.uploadStatuses?.WO?.uploaded);
    console.log("PO uploaded:", agreement.uploadStatuses?.PO?.uploaded);
    console.log("LOI uploaded:", agreement.uploadStatuses?.LOI?.uploaded);
    console.log("EmailApproval uploaded:", agreement.uploadStatuses?.EmailApproval?.uploaded);
    
    // Extract WO/PO/LOI information from uploadStatuses
    const woPoLoiInfo = [];
    if (agreement.uploadStatuses?.WO?.uploaded) woPoLoiInfo.push("WO");
    if (agreement.uploadStatuses?.PO?.uploaded) woPoLoiInfo.push("PO");
    if (agreement.uploadStatuses?.LOI?.uploaded) woPoLoiInfo.push("LOI");
    if (agreement.uploadStatuses?.EmailApproval?.uploaded) woPoLoiInfo.push("Email Approval");
    const woPoLoiText = woPoLoiInfo.length > 0 ? woPoLoiInfo.join(" / ") : "None uploaded";
    
    console.log("woPoLoiInfo array:", woPoLoiInfo);
    console.log("woPoLoiText result:", woPoLoiText);
    
    // Extract important clauses (first 3 clauses as summary for table display)
    const importantClausesSummary = agreement.importantClauses && agreement.importantClauses.length > 0
      ? agreement.importantClauses.slice(0, 3).map(clause => 
          typeof clause === 'string' ? clause : clause.title
        ).join(", ")
      : "No clauses";
    
    // Join all selected branches with commas to display all branches
    console.log("Selected branches for agreement:", agreement.selectedBranches);
    const allBranches = (agreement.selectedBranches && agreement.selectedBranches.length > 0) 
      ? agreement.selectedBranches.map(branch => typeof branch === 'string' ? branch : branch.name).join(", ") 
      : "Not specified";
    console.log("allBranches result:", allBranches);
    
    // Calculate priority based on days since submission (like in dashboard)
    const submittedDate = new Date(agreement.submittedDate);
    const daysDiff = Math.floor((new Date() - submittedDate) / (1000 * 60 * 60 * 24));
    let priority = "Low";
    if (daysDiff > 5) priority = "High";
    else if (daysDiff >= 3) priority = "Medium";

    // Calculate addendums count for this agreement
    const addendumsCount = (addendums?.addendums || []).filter(addendum => {
      return addendum.parentAgreementId === agreement.id;
    }).length;

    return {
      id: agreement.id || `AGR${String(index + 1).padStart(3, '0')}`,
      client: agreement.selectedClient || "Unknown Client",
      location: allBranches, // Using all branches as location
      site: allBranches,
      city: allBranches, // Using all branches as city for now
      state: "Not specified", // This info isn't captured in form, keeping as placeholder
      wo: woPoLoiText,
      priority: agreement.priority || priority, // Use agreement priority if available, otherwise calculate
      checker: agreement.submittedBy || "Unknown",
      entityType: agreement.entityType || "single",
      date: agreement.submittedDate || new Date().toISOString().split('T')[0],
      status: getCurrentStatus(agreement),
      originalStatus: agreement.status, // Preserve original status for modal display
      importantClauses: importantClausesSummary,
      finalAgreement: agreement.finalAgreement || null,
      originalAgreement: agreement, // Keep reference to original data
      addendumsCount, // Add addendums count
    };
  });

  // Debug transformed data
  console.log("=== TRANSFORMED DATA DEBUG ===");
  console.log("Transformed data length:", transformedData.length);
  console.log("Transformed data:", transformedData);
  console.log("Sample row checker field:", transformedData[0]?.checker);

  const [data, setData] = useState(transformedData);
  const [details, setDetails] = useState({ open: false, agreement: null });
  const [statusHistoryModal, setStatusHistoryModal] = useState({ open: false, history: [], title: "" });

  // Update data when agreements prop changes
  React.useEffect(() => {
    setData(transformedData);
  }, [agreements]);

  // Get unique values for dropdowns
  const uniqueClients = [ ...new Set(data.map(row => row.client)) ];
  const uniqueCities = [ ...new Set(data.map(row => row.city)) ];
  const uniqueStates = [ ...new Set(data.map(row => row.state)) ];



  const handlePriorityChange = (agreementId, newPriority) => {
    setData(prev => prev.map(row =>
      row.id === agreementId ? { ...row, priority: newPriority } : row
    ));
    
    // Update the original agreement data if onStatusUpdate is provided
    if (onStatusUpdate) {
      onStatusUpdate(agreementId, null, null, null, newPriority);
    }
  };

  const handleStatusChange = (agreementId, newStatus) => {
    setData(prev => prev.map(row => {
      if (row.id === agreementId) {
        const history = row.statusHistory || [];
        const timestamp = new Date().toISOString();
        let notes = "";
        if (newStatus === "Approved") {
          notes = "Final approval granted by approver";
        } else if (newStatus === "Execution Pending") {
          notes = "Status reset to pending";
        } else {
          notes = `Status updated to ${newStatus}`;
        }
        const newHistoryEntry = {
          notes,
          date: new Date().toISOString().split('T')[0],
          timestamp,
          status: newStatus
        };
        return {
          ...row,
          status: newStatus,
          statusHistory: [...history, newHistoryEntry]
        };
      }
      return row;
    }));

    if (onStatusUpdate) {
      const approvedDate = newStatus !== "Execution Pending" ? new Date().toISOString().split('T')[0] : null;
      onStatusUpdate(agreementId, newStatus, approvedDate);
    }
  };

  // Handle status progress updates (notes, dates, history)
  const handleStatusProgressUpdate = (agreementId, field, value) => {
    setData(prev => prev.map(row => {
      if (row.id === agreementId) {
        return {
          ...row,
          statusProgress: {
            ...row.statusProgress,
            [field]: value
          }
        };
      }
      return row;
    }));
  };

  // Handle saving status progress to history
  const handleSaveStatusProgress = (agreementId) => {
    setData(prev => prev.map(row => {
      if (row.id === agreementId) {
        const currentProgress = row.statusProgress || {};
        const history = row.statusHistory || [];
        
        if (currentProgress.notes || currentProgress.date) {
          const newHistoryEntry = {
            notes: currentProgress.notes || "",
            date: currentProgress.date || new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            status: row.status
          };
          
          return {
            ...row,
            statusHistory: [...history, newHistoryEntry],
            statusProgress: { notes: "", date: "" } // Clear current progress
          };
        }
      }
      return row;
    }));
  };

  // Handle editing agreement
  const handleEditAgreement = (agreement) => {
    // This will open the agreement form in edit mode
    if (onCreateAddendum) {
      // We'll use the same callback but pass a flag to indicate edit mode
      onCreateAddendum(agreement, 'edit');
    }
  };

  // Handle creating new addendum
  const handleCreateAddendum = (agreement) => {
    console.log("Creating new addendum for agreement:", agreement);
    
    // Call the parent component to open the addendum form
    if (onCreateAddendum) {
      onCreateAddendum(agreement, 'addendum');
    }
  };

  // Handle viewing status history
  const handleViewStatusHistory = (agreementId, clientName) => {
    const agreement = data.find(row => row.id === agreementId);
    if (agreement) {
      setStatusHistoryModal({
        open: true,
        history: agreement.statusHistory || [],
        title: `Status History - ${clientName}`
      });
    }
  };

  const handleFinalAgreementUploadFromModal = (agreementId, file) => {
    // Update local data with final agreement
    setData(prev => prev.map(row => 
      row.id === agreementId 
        ? { 
            ...row, 
            status: "Final Agreement Uploaded",
            finalAgreement: file 
          }
        : row
    ));
    
    // Update the agreement in parent state
    if (onStatusUpdate) {
      const approvedDate = new Date().toISOString().split('T')[0];
      onStatusUpdate(agreementId, "Final Agreement Uploaded", approvedDate, file);
    }
  };

  // Handler for final agreement upload
  const handleFinalAgreementUpload = (agreementId, file) => {
    // Update local data with final agreement
    setData(prev => prev.map(row => 
      row.id === agreementId 
        ? { 
            ...row, 
            status: "Final Agreement Uploaded",
            finalAgreement: file 
          }
        : row
    ));
    
    // Update the agreement in parent state
    if (onStatusUpdate) {
      const approvedDate = new Date().toISOString().split('T')[0];
      onStatusUpdate(agreementId, "Final Agreement Uploaded", approvedDate, file);
    }
    
    setShowFinalUpload(null);
  };

  // Handler for viewing a specific addendum
  const handleViewAddendum = (addendum) => {
    console.log("=== VIEWING ADDENDUM ===");
    console.log("Addendum data:", addendum);
    console.log("Addendum ID:", addendum?.id);
    console.log("Addendum title:", addendum?.title);
    console.log("Addendum status:", addendum?.status);
    
    if (!addendum) {
      console.error("No addendum data provided");
      return;
    }
    
    setAddendumDetailsModal({ open: true, addendum: addendum });
  };

  // Handler for viewing clause history
  const handleViewClauseHistory = (clauseIndex, clauseTitle, modifications) => {
    setClauseHistoryModal({ open: true, clause: { index: clauseIndex, title: clauseTitle }, modifications: modifications });
  };

  // Handler for editing addendum
  const handleEditAddendum = (addendum) => {
    console.log("Editing addendum:", addendum);
    
    // Call the parent component to open the addendum form in edit mode
    if (onCreateAddendum) {
      onCreateAddendum(addendum, 'edit');
    }
  };

  // Handler for saving addendum changes
  const handleSaveAddendumChanges = () => {
    if (editingAddendum) {
      // Update the addendum in the addendums array
      const updatedAddendums = (addendums?.addendums || []).map(addendum => 
        addendum.id === editingAddendum.id ? editingAddendum : addendum
      );
      
      // Update local state
      setAddendumDetailsModal(prev => ({
        ...prev,
        addendum: editingAddendum
      }));
      
      // Close edit mode
      setIsEditing(false);
      setEditingAddendum(null);
      
      // Here you would typically call an API to save the changes
      console.log("Saving addendum changes:", editingAddendum);
    }
  };

  // Handler for canceling addendum edit
  const handleCancelAddendumEdit = () => {
    setIsEditing(false);
    setEditingAddendum(null);
  };


  // Filtering logic (dropdowns and date range)
  const filtered = data.filter(row => {
    // Role-based filtering - Show agreements for checker role (only their own)
    if (userRole?.toLowerCase() === "checker") {
      // For checker role, only show agreements they submitted
      console.log("Filtering for checker - userRole:", userRole, "row.checker:", row.checker, "row.client:", row.client, "match:", row.checker === "checker");
      return row.checker === "checker";
    }
    
    // Client, city, state filters
    const clientMatch = !filters.client || row.client === filters.client;
    const cityMatch = !filters.city || row.city === filters.city;
    const stateMatch = !filters.state || row.state === filters.state;
    
    // Date range filter
    let dateMatch = true;
    if (filters.fromDate || filters.toDate) {
      const rowDate = new Date(row.date);
      const fromDate = filters.fromDate ? new Date(filters.fromDate) : null;
      const toDate = filters.toDate ? new Date(filters.toDate) : null;
      
      if (fromDate && toDate) {
        dateMatch = rowDate >= fromDate && rowDate <= toDate;
      } else if (fromDate) {
        dateMatch = rowDate >= fromDate;
      } else if (toDate) {
        dateMatch = rowDate <= toDate;
      }
    }
    
    // Addendums filter
    let addendumsMatch = true;
    if (filters.addendumsFilter === "with") {
      addendumsMatch = row.addendumsCount > 0;
    } else if (filters.addendumsFilter === "without") {
      addendumsMatch = row.addendumsCount === 0;
    }
    
    return clientMatch && cityMatch && stateMatch && dateMatch && addendumsMatch;
  });

  // Sort by submission date (most recent first)
  const sortedAndFiltered = filtered.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB - dateA; // Most recent first
  });

     // Export Excel
   const handleExportExcel = () => {
     const exportData = sortedAndFiltered.map((row, i) => ({
       "Sr. No": i + 1,
       "Client Name": row.client,
       "Client Site": row.site,
       "WO / PO / LOI / Email": row.wo,
       "Entity Type": row.entityType,
       "Submitted Date": row.date,
       "Important Clauses": row.importantClauses,
       Priority: row.priority,
       Status: row.status,
       "Addendums Count": row.addendumsCount,
     }));
     const ws = XLSX.utils.json_to_sheet(exportData);
     const wb = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb, ws, "Agreements");
     
     // Generate filename with date range if specified
     let filename = "agreements";
     if (filters.fromDate || filters.toDate) {
       const fromDateStr = filters.fromDate ? filters.fromDate.replace(/-/g, '') : 'start';
       const toDateStr = filters.toDate ? filters.toDate.replace(/-/g, '') : 'end';
       filename += `_${fromDateStr}_to_${toDateStr}`;
     }
     filename += ".xlsx";
     
     XLSX.writeFile(wb, filename);
   };

     // Export PDF
   const handleExportPDF = () => {
     const doc = new jsPDF();
     const columns = [
       "Sr. No", "Client Name", "Client Site", "WO / PO / LOI / Email", "Entity Type",
       "Submitted Date", "Important Clauses", "Priority", "Status", "Addendums Count"
     ];
     const rows = sortedAndFiltered.map((row, i) => [
       i + 1,
       row.client,
       row.site,
       row.wo,
       row.entityType,
       row.date,
       row.importantClauses,
       row.priority,
       row.status,
       row.addendumsCount,
     ]);
     autoTable(doc, { head: [columns], body: rows, styles: { fontSize: 6 } });
     
     // Generate filename with date range if specified
     let filename = "agreements";
     if (filters.fromDate || filters.toDate) {
       const fromDateStr = filters.fromDate ? filters.fromDate.replace(/-/g, '') : 'start';
       const toDateStr = filters.toDate ? filters.toDate.replace(/-/g, '') : 'end';
       filename += `_${fromDateStr}_to_${toDateStr}`;
     }
     filename += ".pdf";
     
     doc.save(filename);
   };

  // Update data when agreements prop changes
  React.useEffect(() => {
    setData(transformedData);
  }, [agreements]);

  // Missing state variables that were removed
  const [progressNotes, setProgressNotes] = useState({});
  const [statusDates, setStatusDates] = useState({});

  // Missing helper functions that were removed
  const getAllBranches = (agreement) => {
    if (!agreement.selectedBranches || agreement.selectedBranches.length === 0) {
      return "Not specified";
    }
    return agreement.selectedBranches.map(branch => typeof branch === 'string' ? branch : branch.name).join(", ");
  };

  const getDocumentStatus = (agreement, docType) => {
    if (!agreement.uploadStatuses || !agreement.uploadStatuses[docType] || !agreement.uploadStatuses[docType].uploaded) {
      return null;
    }
    
    return (
      <span className="text-blue-600 hover:text-blue-800 underline text-xs font-medium cursor-pointer transition-colors">
        {docType}
      </span>
    );
  };

  const getImportantClauses = (agreement, addendums = []) => {
    try {
    if (!agreement.importantClauses || agreement.importantClauses.length === 0) {
      return <span className="text-gray-400 text-xs">No clauses specified</span>;
    }
    
    // Debug: Log the agreement and its important clauses
    console.log("=== FILTERING IMPORTANT CLAUSES ===");
    console.log("Agreement ID:", agreement.id);
    console.log("Important clauses:", agreement.importantClauses);
    console.log("Important clauses length:", agreement.importantClauses?.length);
    
    // Filter clauses to only show those with uploaded documents
    const clausesWithDocuments = agreement.importantClauses.filter(clause => {
      if (!clause) return false;
      
      console.log("Checking clause:", clause);
      console.log("Clause type:", typeof clause);
      console.log("Clause has documents array:", clause.documents);
      console.log("Clause has file property:", clause.file);
      
      // Check if clause has its own documents array with files (for demo data)
      if (typeof clause === 'object' && clause.documents && Array.isArray(clause.documents) && clause.documents.length > 0) {
        console.log("Clause has documents array - INCLUDING");
        return true;
      }
      
      // Check if clause has a file property with uploaded file (for new agreements)
      if (typeof clause === 'object' && clause.file && clause.file !== null) {
        console.log("Clause has file property - INCLUDING");
        return true;
      }
      
      // For string clauses, don't show them unless they have their own documents
      if (typeof clause === 'string') {
        console.log("Clause is string - EXCLUDING");
        return false;
      }
      
      console.log("Clause has no documents - EXCLUDING");
      return false;
    });
    
    console.log("Filtered clauses with documents:", clausesWithDocuments);
    console.log("Filtered clauses length:", clausesWithDocuments.length);
    
    // Check if there are any uploaded documents at all
    const hasAnyUploadedDocuments = agreement.uploadStatuses && Object.keys(agreement.uploadStatuses).some(docType => 
      agreement.uploadStatuses[docType]?.uploaded
    );
    
    console.log("Has any uploaded documents:", hasAnyUploadedDocuments);
    console.log("Upload statuses:", agreement.uploadStatuses);
    
    if (clausesWithDocuments.length === 0 || !hasAnyUploadedDocuments) {
      return <span className="text-gray-400 text-xs">No clauses with documents uploaded</span>;
    }
    
    return (
      <div className="space-y-1">
          {clausesWithDocuments.slice(0, 3).map((clause, index) => {
            // Ensure clause is properly handled
            if (!clause) {
              console.warn("Empty clause found at index:", index);
              return null;
            }
            
            // Additional safety check for clause object structure
            if (typeof clause === 'object' && clause !== null) {
              console.log(`Clause ${index} is object:`, clause);
              // Ensure we only render string properties
              if (typeof clause.title !== 'string' && typeof clause.content !== 'string') {
                console.warn(`Clause ${index} has no valid string properties:`, clause);
                return null;
              }
            }
            // Get clause modifications for this clause
            const clauseIndex = agreement.importantClauses.indexOf(clause);
            const clauseModifications = [];
          
          // Check all addendums for modifications to this clause
          (addendums || []).forEach(addendum => {
            if (addendum.parentAgreementId === agreement.id && addendum.clauseModifications) {
              addendum.clauseModifications.forEach(mod => {
                if (parseInt(mod.clauseNumber) - 1 === clauseIndex) {
                  clauseModifications.push({
                    ...mod,
                    addendumId: addendum.id,
                    addendumTitle: addendum.title,
                    addendumStatus: addendum.status,
                    addendumDate: addendum.submittedDate
                  });
                }
              });
            }
          });
          
          const hasModifications = clauseModifications.length > 0;
          
          return (
            <div key={index} className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
              hasModifications ? 'bg-yellow-50 border border-yellow-200' : ''
            }`}>
              <span 
                className={`text-blue-600 hover:text-blue-800 underline text-xs font-medium cursor-pointer transition-colors ${
                  hasModifications ? 'text-orange-700 font-semibold' : ''
                }`}
                onClick={() => {
                  const clauseTitle = typeof clause === 'string' ? clause : (clause.title || 'Untitled Clause');
                  
                  // Check if clause has documents to open
                  if (typeof clause === 'object' && clause.documents && Array.isArray(clause.documents) && clause.documents.length > 0) {
                    // Open the first document (demo data)
                    const firstDoc = clause.documents[0];
                    alert(`Opening document: ${firstDoc.name}\nSize: ${firstDoc.size}\nType: ${firstDoc.type}\n\nThis is demo data. In a real application, this would open the actual document.`);
                  } else if (typeof clause === 'object' && clause.file && clause.file !== null) {
                    // Open the clause file (new agreements)
                    alert(`Opening document: ${clause.file.name}\nSize: ${clause.file.size}\nType: ${clause.file.type}\n\nThis is demo data. In a real application, this would open the actual document.`);
                  } else if (typeof clause === 'string') {
                    // For string clauses, check if there's a corresponding file upload
                    const clauseName = clause.toLowerCase();
                    const matchingDocType = Object.keys(agreement.uploadStatuses || {}).find(docType => 
                      agreement.uploadStatuses[docType]?.uploaded && 
                      docType.toLowerCase().includes(clauseName.split(' ')[0].toLowerCase())
                    );
                    
                    if (matchingDocType && agreement.uploadStatuses[matchingDocType].file) {
                      const file = agreement.uploadStatuses[matchingDocType].file;
                      alert(`Opening document: ${file.name}\nSize: ${file.size}\nType: ${matchingDocType}\n\nThis is demo data. In a real application, this would open the actual document.`);
                    } else {
                      alert(`Clause: ${clauseTitle}\n\nNo document uploaded for this clause.`);
                    }
                  } else {
                    alert(`Clause: ${clauseTitle}\n\nNo document uploaded for this clause.`);
                  }
                }}
                title={`Click to view details for: ${typeof clause === 'string' ? clause : (clause.title || 'Untitled Clause')}`}
              >
                {(() => {
                  // Comprehensive safety check to prevent object rendering
                  if (typeof clause === 'string') {
                    return clause;
                  } else if (typeof clause === 'object' && clause !== null) {
                    if (typeof clause.title === 'string') {
                      return clause.title;
                    } else if (typeof clause.content === 'string') {
                      return clause.content;
                    } else {
                      console.warn('Clause object has no valid string properties:', clause);
                      return 'Untitled Clause';
                    }
                  } else {
                    console.warn('Invalid clause type:', typeof clause, clause);
                    return 'Untitled Clause';
                  }
                })()}
                {hasModifications && <span className="ml-1">✨</span>}
            </span>
              
              {/* Addendum modification indicators */}
              {hasModifications && (
                <div className="flex items-center gap-1">
                  {clauseModifications.map((mod, modIndex) => (
                    <div key={modIndex} className="relative group">
                      <span 
                        className={`px-2 py-1 rounded-full text-xs font-medium cursor-help ${
                          mod.modificationType === "Modified" ? "bg-orange-100 text-orange-700 border border-orange-200" :
                          mod.modificationType === "Added" ? "bg-green-100 text-green-700 border border-green-200" :
                          mod.modificationType === "Removed" ? "bg-red-100 text-red-700 border border-red-200" :
                          "bg-blue-100 text-blue-700 border border-blue-200"
                        }`}
                        title={`${mod.modificationType} by Addendum #${mod.addendumId}`}
                      >
                        {mod.modificationType === "Modified" ? "🔄 Modified" :
                         mod.modificationType === "Added" ? "➕ New" :
                         mod.modificationType === "Removed" ? "❌ Removed" :
                         "📝 Changed"}
              </span>
                      
                      {/* Hover Tooltip with Previous Version Information */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 min-w-[250px]">
                        <div className="text-center mb-2 font-medium">
                          {mod.modificationType} Clause - Previous Version
                        </div>
                        <div className="space-y-1 text-left">
                          <div><strong>Addendum:</strong> #{mod.addendumId}</div>
                          <div><strong>Title:</strong> {mod.addendumTitle}</div>
                          <div><strong>Status:</strong> {mod.addendumStatus}</div>
                          <div><strong>Date:</strong> {new Date(mod.addendumDate).toLocaleDateString()}</div>
                          <div className="border-t border-gray-600 pt-1 mt-2">
                            <strong>Previous Version:</strong>
                            <div className="text-gray-300 text-xs mt-1 p-2 bg-gray-800 rounded">
                              {mod.previousVersion || "Original clause content before modification"}
                            </div>
                          </div>
                          <div className="border-t border-gray-600 pt-1 mt-2">
                            <strong>Current Changes:</strong>
                            <div className="text-gray-300 text-xs mt-1 p-2 bg-gray-800 rounded">
                              {mod.details}
                            </div>
                          </div>
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  ))}
                  
                  {/* View History Button */}
                  <button
                    className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 cursor-pointer transition-colors"
                    title="View complete clause history and previous versions"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewClauseHistory(clauseIndex, clause.title || clause, clauseModifications);
                    }}
                  >
                    📋 View History
                  </button>
                  
                  {/* Edit Addendum Button - Only for Checker role */}
                  {userRole === "checker" && (
                    <button
                      className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded hover:bg-orange-200 cursor-pointer transition-colors"
                      title="Edit this addendum"
                      onClick={(e) => {
                        e.stopPropagation();
                        const addendum = clauseModifications[0]; // Get the addendum from modifications
                        if (addendum) {
                          const fullAddendum = (addendums || []).find(add => add.id === addendum.addendumId);
                          if (fullAddendum) {
                            handleEditAddendum(fullAddendum);
                          }
                        }
                      }}
                    >
                      ✏️ Edit
                    </button>
                  )}
                </div>
              )}
              
            {/* Document icon */}
            <span className="text-gray-500 text-xs">📋</span>
          </div>
          );
        })}
      </div>
    );
    } catch (error) {
      console.error("Error in getImportantClauses:", error);
      return <span className="text-red-400 text-xs">Error loading clauses</span>;
    }
  };

  // Handlers for progress notes and status dates
  const handleProgressNoteChange = (agreementId, value) => {
    setProgressNotes(prev => ({
      ...prev,
      [agreementId]: value
    }));
  };

  const handleStatusDateChange = (agreementId, value) => {
    setStatusDates(prev => ({
      ...prev,
      [agreementId]: value
    }));
  };

  const handleSaveProgress = (agreementId) => {
    console.log("Saving progress for agreement:", agreementId, {
      notes: progressNotes[agreementId],
      date: statusDates[agreementId]
    });
    alert("Progress saved successfully!");
  };

  // Handle addendum status updates
  const handleAddendumStatusUpdate = (addendumId, newStatus) => {
    console.log("Updating addendum status:", addendumId, "to:", newStatus);
    alert(`Addendum status updated to ${newStatus} successfully!`);
   };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
              {/* Show export buttons for all roles now that checkers can see agreements */}
        <div className="flex gap-4 mb-6">
          <button className="bg-white border px-4 py-2 rounded shadow-sm flex items-center gap-2" onClick={handleExportExcel}><span>⬇️</span> Export Excel</button>
          <button className="bg-white border px-4 py-2 rounded shadow-sm flex items-center gap-2" onClick={handleExportPDF}><span>⬇️</span> Export PDF</button>
          <div className="text-sm text-gray-600 flex items-center">
            💡 Use date filters above to export agreements within a specific date range
          </div>
        </div>
      <div className="bg-white rounded-2xl shadow p-6 mb-8">
        {/* Show filters for all roles now that checkers can see agreements */}
        {userRole?.toLowerCase() === "checker" && (
        <div className="flex flex-wrap gap-4 mb-4">
            <select className="border rounded px-3 py-2 text-sm" value={filters.client} onChange={e => setFilters(f => ({ ...f, client: e.target.value }))}>
              <option value="">All Clients</option>
              {uniqueClients.map(client => <option key={client} value={client}>{client}</option>)}
            </select>
            <select className="border rounded px-3 py-2 text-sm" value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}>
              <option value="">All Cities</option>
              {uniqueCities.map(city => <option key={city} value={city}>{city}</option>)}
            </select>
            <select className="border rounded px-3 py-2 text-sm" value={filters.state} onChange={e => setFilters(f => ({ ...f, state: e.target.value }))}>
              <option value="">All States</option>
              {uniqueStates.map(state => <option key={state} value={state}>{state}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">From Date:</label>
              <input
                type="date"
                className="border rounded px-3 py-2 text-sm"
                value={filters.fromDate}
                onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">To Date:</label>
              <input
                type="date"
                className="border rounded px-3 py-2 text-sm"
                value={filters.toDate}
                onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))}
              />
            </div>
            <select 
              className="border rounded px-3 py-2 text-sm" 
              value={filters.addendumsFilter} 
              onChange={e => setFilters(f => ({ ...f, addendumsFilter: e.target.value }))}
            >
              <option value="all">All Contracts</option>
              <option value="with">With Addendums</option>
              <option value="without">📄 Without Addendums</option>
            </select>
            
            <button
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
              onClick={() => setFilters({ client: "", city: "", state: "", fromDate: "", toDate: "", addendumsFilter: "all" })}
            >
              Clear Filters
            </button>
          </div>
        )}
        
        {/* Filter Summary - Show for all roles now */}
        {(filters.client || filters.city || filters.state || filters.fromDate || filters.toDate) && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <span className="font-medium">Active Filters:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {filters.client && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    Client: {filters.client}
                  </span>
                )}
                {filters.city && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    City: {filters.city}
                  </span>
                )}
                {filters.state && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    State: {filters.state}
                  </span>
                )}
                {filters.addendumsFilter !== "all" && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    {filters.addendumsFilter === "with" ? "With Addendums" : "📄 Without Addendums"}
                  </span>
                )}
                {filters.fromDate && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    From: {new Date(filters.fromDate).toLocaleDateString()}
                  </span>
                )}
                {filters.toDate && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    To: {new Date(filters.toDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {userRole?.toLowerCase() === "checker"
            ? `Agreements (${sortedAndFiltered.length} - Your Submissions)`
            : `Agreements (${sortedAndFiltered.length})`
          }
        </h2>
        
        {/* Show helpful message for checker role */}
        {userRole?.toLowerCase() === "checker" && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-600">💡</span>
                <span className="font-medium">Information for Checker Role</span>
              </div>
              <p className="text-blue-700">
                You can view your submitted agreements below. Use the <strong>"Add Addendum"</strong> button to create modifications for existing agreements, 
                or use the <strong>"New Agreement"</strong> tab to create new agreements.
              </p>
            </div>
          </div>
        )}
        <div className="rounded-lg border border-gray-200 shadow-sm bg-white" style={{ maxWidth: '100%' }}>
          {/* Top Scrollbar */}
          <div 
            ref={setTopScrollRef}
            className="overflow-x-auto border-b border-gray-200" 
            style={{ height: '17px' }}
          >
            <div style={{ width: '1200px', height: '1px' }}></div>
          </div>
          {/* Main Table with Bottom Scrollbar */}
          <div ref={setBottomScrollRef} className="overflow-x-auto">
            <table className="min-w-[1200px] text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <th className="px-6 py-4 font-semibold text-left text-gray-800 min-w-[80px]">Sr. No</th>
                <th className="px-6 py-4 font-semibold text-left text-gray-800 min-w-[150px]">Client Name</th>
                <th className="px-6 py-4 font-semibold text-left text-gray-800 min-w-[120px]">Client Site</th>
                <th className="px-6 py-4 font-semibold text-left text-gray-800 min-w-[180px]">WO / PO / LOI / Email</th>
                <th className="px-6 py-4 font-semibold text-left text-gray-800 min-w-[100px]">Entity Type</th>
                <th className="px-6 py-4 font-semibold text-left text-gray-800 min-w-[120px]">Submitted Date</th>
                <th className="px-6 py-4 font-semibold text-left text-gray-800 min-w-[200px]">Important Clauses</th>
                <th className="px-6 py-4 font-semibold text-left text-gray-800 min-w-[80px]">Priority</th>
                <th className="px-6 py-4 font-semibold text-left text-gray-800 min-w-[120px]">Status</th>
                <th className="px-6 py-4 font-semibold text-left text-gray-800 min-w-[100px]">Addendums</th>
                <th className="px-6 py-4 font-semibold text-left text-gray-800 min-w-[150px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFiltered.length === 0 ? (
                                  <tr>
                    <td colSpan="11" className="px-4 py-8 text-center text-gray-500">
                      {userRole?.toLowerCase() === "checker" 
                        ? "No agreements submitted yet. Use the 'New Agreement' tab to create your first agreement."
                        : "No agreements submitted yet. Agreements submitted by checkers will appear here."
                      }
                    </td>
                  </tr>
               ) : (
                 sortedAndFiltered.map((row, i) => (
                   <tr key={row.id} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 border-b border-gray-100 transition-colors`}>
                     <td className="px-6 py-4 text-center">{i + 1}</td>
                     <td className="px-6 py-4 font-semibold text-gray-800">{row.client}</td>
                     <td className="px-6 py-4 text-gray-700">{row.site}</td>
                     <td className="px-6 py-4 min-w-[120px]">
                       <DocumentLinks 
                         uploadStatuses={row.originalAgreement.uploadStatuses || {}}
                         documents={[
                           { type: 'WO', label: 'WO' },
                           { type: 'PO', label: 'PO' },
                           { type: 'LOI', label: 'LOI' },
                           { type: 'EmailApproval', label: 'Email' }
                         ]}
                       />
                     </td>
                     <td className="px-6 py-4 text-gray-700">{row.entityType}</td>
                     <td className="px-6 py-4 text-gray-700">{row.date}</td>
                     <td className="px-6 py-4 min-w-[150px]">
                       <ErrorBoundary>
                         {getImportantClauses(row.originalAgreement, addendums?.addendums || [])}
                       </ErrorBoundary>
                     </td>
                     <td className="px-6 py-4">
                       {priorityBadge(row.priority)}
                     </td>
                     <td className="px-6 py-4 min-w-[200px]">
                       {/* Status Badge */}
                       <div className="mb-3">
                         <span className={`px-3 py-2 rounded-full text-sm font-medium ${
                           row.status === "Execution Pending" ? "bg-yellow-100 text-yellow-700" :
                           row.status === "Executed" ? "bg-blue-100 text-blue-700" :
                           row.status === "Under Process with Client" ? "bg-purple-100 text-purple-700" :
                           row.status === "Approved" ? "bg-green-100 text-green-700" :
                           "bg-gray-100 text-gray-700"
                         }`}>
                           {row.status}
                         </span>
                       </div>
                       
                       {/* Status Progress Input - Only show for non-final statuses */}
                       {row.status !== "Approved" && (
                         <div className="space-y-3">
                           <textarea
                             className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
                             placeholder="Enter progress notes..."
                             rows="2"
                             value={row.statusProgress?.notes || ""}
                             onChange={(e) => handleStatusProgressUpdate(row.id, "notes", e.target.value)}
                           />
                           
                           <div className="flex items-center gap-2">
                             <input
                               type="date"
                               className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1 focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
                               value={row.statusProgress?.date || ""}
                               onChange={(e) => handleStatusProgressUpdate(row.id, "date", e.target.value)}
                             />
                             <button
                               className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                               onClick={() => handleSaveStatusProgress(row.id)}
                               title="Save progress"
                             >
                               Save
                             </button>
                           </div>
                           
                           <button
                             className="w-full text-blue-600 underline text-sm hover:text-blue-800 transition-colors"
                             onClick={() => handleViewStatusHistory(row.id, row.client)}
                             title="View status history"
                           >
                             ▶ View History ({row.statusHistory?.length || 0})
                           </button>
                         </div>
                       )}
                       
                       {/* Final Status Message for Approved */}
                       {row.status === "Approved" && (
                         <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
                           ✓ Approved - No further action required
                         </div>
                       )}
                     </td>
                       
                     {/* Addendums Count Column */}
                     <td className="px-6 py-4 text-center">
                         {row.addendumsCount > 0 ? (
                             <div className="flex items-center justify-center gap-2">
                             {/* Very light blue circle with count - matching live URL design */}
                             <div className="w-6 h-6 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center justify-center">
                                 {row.addendumsCount}
                             </div>
                             {/* Brown eye icon for viewing - matching live URL design */}
                                    <button
                                      onClick={() => {
                                 const agreementAddendums = (addendums?.addendums || []).filter(addendum => 
                                   addendum.parentAgreementId === row.originalAgreement.id
                                 );
                                 if (agreementAddendums.length === 1) {
                                   // Single addendum - direct view
                                   handleViewAddendum(agreementAddendums[0]);
                                 } else if (agreementAddendums.length > 1) {
                                   // Multiple addendums - show dropdown
                                        const newDropdownOpen = { ...dropdownOpen };
                                        newDropdownOpen[row.id] = !newDropdownOpen[row.id];
                                        setDropdownOpen(newDropdownOpen);
                                 }
                                      }}
                               className="text-amber-600 hover:text-amber-700 transition-colors"
                               title="View addendums"
                                    >
                                      <span className="text-lg">👁️</span>
                                    </button>
                                   
                             {/* Dropdown for multiple addendums */}
                             {row.addendumsCount > 1 && dropdownOpen[row.id] && (
                                     <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
                                       <div className="p-2 border-b border-gray-200 bg-gray-50">
                                         <div className="text-xs font-medium text-gray-700">Select Addendum to View:</div>
                                       </div>
                                       <div className="max-h-48 overflow-y-auto">
                                         {addendums
                                           .filter(addendum => addendum.parentAgreementId === row.originalAgreement.id)
                                           .map((addendum, idx) => (
                                             <button
                                               key={addendum.id}
                                               onClick={() => {
                                                 handleViewAddendum(addendum);
                                                 const newDropdownOpen = { ...dropdownOpen };
                                                 newDropdownOpen[row.id] = false;
                                                 setDropdownOpen(newDropdownOpen);
                                               }}
                                               className="w-full text-left p-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                             >
                                               <div className="flex items-center justify-between mb-1">
                                                 <span className="font-medium text-gray-800 text-xs">
                                                   #{addendum.id}
                                                 </span>
                                                 <span className={`px-1 py-0.5 rounded text-xs ${
                                                   addendum.status === "Approved" ? "bg-green-100 text-green-700" :
                                                   addendum.status === "Rejected" ? "bg-red-100 text-red-700" :
                                                   addendum.status === "Under Review" ? "bg-blue-100 text-blue-700" :
                                                   "bg-yellow-100 text-yellow-700"
                                                 }`}>
                                                   {addendum.status}
                                                 </span>
                                               </div>
                                               <div className="text-xs text-gray-600 truncate" title={addendum.title}>
                                                 {addendum.title}
                                               </div>
                                               <div className="text-xs text-gray-500">
                                                 📅 {new Date(addendum.submittedDate).toLocaleDateString()}
                                               </div>
                                             </button>
                                           ))}
                                       </div>
                                     </div>
                                   )}
                           </div>
                         ) : (
                           <span className="text-gray-400 text-xs">0</span>
                         )}
                       </td>
                       
                     {/* Actions Column */}
                     <td className="px-6 py-4 text-center">
                       <div className="flex flex-col gap-3">
                         {/* Review Button - For both roles */}
                         <button 
                           className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors font-medium" 
                           title="Review & Take Action" 
                           onClick={() => {
                             console.log("=== OPENING DETAILS MODAL ===");
                             console.log("Row data:", row);
                             console.log("Row originalAgreement:", row.originalAgreement);
                             console.log("Row originalAgreement contactInfo:", row.originalAgreement?.contactInfo);
                             setDetails({ open: true, agreement: row });
                           }}
                         >
                           Review
                         </button>
                         
                         {/* Edit Agreement Button - Only for Checker role */}
                         {userRole === "checker" && (
                           <button 
                             className="bg-orange-600 text-white px-4 py-2 rounded-md text-sm hover:bg-orange-700 transition-colors font-medium" 
                             title="Edit Agreement" 
                             onClick={() => handleEditAgreement(row.originalAgreement)}
                           >
                             Edit
                           </button>
                         )}
                         
                         {/* Add Addendum Button - Only for Checker role */}
                         {userRole === "checker" && (
                           <button 
                             className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 transition-colors font-medium" 
                             title="Create New Addendum" 
                             onClick={() => handleCreateAddendum(row.originalAgreement)}
                           >
                             Add Addendum
                           </button>
                         )}
                         
                         {/* Edit Addendum Buttons - Only for Checker role and if addendums exist */}
                         {userRole === "checker" && row.addendumsCount > 0 && (
                           <div className="flex flex-col gap-2">
                             {(addendums?.addendums || []).filter(addendum => 
                               addendum.parentAgreementId === row.originalAgreement.id
                             ).map((addendum, index) => (
                               <button
                                 key={addendum.id}
                                 className="bg-orange-600 text-white px-3 py-1 rounded-md text-xs hover:bg-orange-700 transition-colors font-medium"
                                 title={`Edit Addendum: ${addendum.title}`}
                                 onClick={() => handleEditAddendum(addendum)}
                               >
                                 ✏️ Edit #{addendum.id}
                               </button>
                             ))}
                           </div>
                         )}
                       </div>
                     </td>
                   </tr>
                 ))
               )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Final Agreement Upload Modal */}
      {showFinalUpload && (
        <FinalAgreementUpload
          agreementId={showFinalUpload}
          onUpload={handleFinalAgreementUpload}
          onCancel={() => setShowFinalUpload(null)}
        />
      )}


       <DetailsModal 
         open={details.open} 
         onClose={() => setDetails({ open: false, agreement: null })} 
         agreement={details.agreement}
         onPriorityChange={handlePriorityChange}
         onStatusChange={handleStatusChange}
         onFinalAgreementUpload={handleFinalAgreementUploadFromModal}
         addendums={addendums?.addendums || []}
         userRole={userRole}
         onAddendumStatusUpdate={onAddendumStatusUpdate}
         pendingStatusChanges={pendingStatusChanges}
         setPendingStatusChanges={setPendingStatusChanges}
       />
       
       <StatusHistoryModal
         open={statusHistoryModal.open}
         onClose={() => setStatusHistoryModal({ open: false, history: [], title: "" })}
         history={statusHistoryModal.history}
         title={statusHistoryModal.title}
       />

        {/* Addendum Details Modal */}
        {addendumDetailsModal.open && addendumDetailsModal.addendum && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg p-6 min-w-[600px] max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">📄 Addendum Details - #{addendumDetailsModal.addendum?.id || 'Unknown'}</h3>
                  
                  {!addendumDetailsModal.addendum && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mt-2">
                      <p className="text-red-700">⚠️ Error: No addendum data available</p>
                      <p className="text-red-600 text-sm">Modal state: {JSON.stringify(addendumDetailsModal, null, 2)}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600">Version:</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      v{addendumDetailsModal.addendum.version || "1.0"}
                    </span>
                    {addendumDetailsModal.addendum.versionHistory && addendumDetailsModal.addendum.versionHistory.length > 0 && (
                      <span className="text-xs text-gray-500">
                        ({addendumDetailsModal.addendum.versionHistory.length} version{addendumDetailsModal.addendum.versionHistory.length > 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setAddendumDetailsModal({ open: false, addendum: null })} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
              </div>
              
              <p className="text-gray-600 text-sm mb-6">Review and approve the addendum</p>

              {/* Addendum Information */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <b>Title:</b><br/>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingAddendum?.title || ""}
                      onChange={(e) => setEditingAddendum(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full border rounded px-2 py-1 text-sm mt-1"
                    />
                  ) : (
                    typeof addendumDetailsModal.addendum.title === 'string' 
                      ? addendumDetailsModal.addendum.title 
                      : 'Untitled Addendum'
                  )}
                </div>
                <div><b>Parent Agreement:</b><br/>{typeof addendumDetailsModal.addendum.parentAgreementTitle === 'string' ? addendumDetailsModal.addendum.parentAgreementTitle : (addendumDetailsModal.addendum.parentAgreementId || 'Unknown')}</div>
                <div><b>Submitted By:</b><br/>👤 {typeof addendumDetailsModal.addendum.submittedBy === 'string' ? addendumDetailsModal.addendum.submittedBy : 'Unknown'}</div>
                <div><b>Submitted Date:</b><br/>📅 {addendumDetailsModal.addendum.submittedDate ? new Date(addendumDetailsModal.addendum.submittedDate).toLocaleDateString() : 'Unknown'}</div>
                <div>
                  <b>Effective Date:</b><br/>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editingAddendum?.effectiveDate ? editingAddendum.effectiveDate.split('T')[0] : ""}
                      onChange={(e) => setEditingAddendum(prev => ({ ...prev, effectiveDate: e.target.value }))}
                      className="w-full border rounded px-2 py-1 text-sm mt-1"
                    />
                  ) : (
                    addendumDetailsModal.addendum.effectiveDate ? new Date(addendumDetailsModal.addendum.effectiveDate).toLocaleDateString() : 'Not specified'
                  )}
                </div>
                <div><b>Status:</b><br/>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    addendumDetailsModal.addendum.status === "Approved" ? "bg-green-100 text-green-700" :
                    addendumDetailsModal.addendum.status === "Rejected" ? "bg-red-100 text-red-700" :
                    addendumDetailsModal.addendum.status === "Under Review" ? "bg-blue-100 text-blue-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {addendumDetailsModal.addendum.status}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">📝 Description</label>
                {isEditing ? (
                  <textarea
                    value={editingAddendum?.description || ""}
                    onChange={(e) => setEditingAddendum(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm resize-none"
                    rows="3"
                  />
                ) : (
                  <div className="bg-gray-50 p-3 rounded border text-sm">
                    {typeof addendumDetailsModal.addendum.description === 'string' 
                      ? addendumDetailsModal.addendum.description 
                      : 'No description provided'}
                  </div>
                )}
              </div>

              {/* Reason and Impact */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">🔍 Reason for Changes</label>
                  {isEditing ? (
                    <textarea
                      value={editingAddendum?.reason || ""}
                      onChange={(e) => setEditingAddendum(prev => ({ ...prev, reason: e.target.value }))}
                      className="w-full border rounded px-3 py-2 text-sm resize-none"
                      rows="3"
                    />
                  ) : (
                    <div className="bg-gray-50 p-3 rounded border text-sm">
                      {typeof addendumDetailsModal.addendum.reason === 'string' 
                        ? addendumDetailsModal.addendum.reason 
                        : 'No reason provided'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">⚡ Impact Assessment</label>
                  {isEditing ? (
                    <textarea
                      value={editingAddendum?.impact || ""}
                      onChange={(e) => setEditingAddendum(prev => ({ ...prev, impact: e.target.value }))}
                      className="w-full border rounded px-3 py-2 text-sm resize-none"
                      rows="3"
                    />
                  ) : (
                    <div className="bg-gray-50 p-3 rounded border text-sm">
                      {typeof addendumDetailsModal.addendum.impact === 'string' 
                        ? addendumDetailsModal.addendum.impact 
                        : 'No impact assessment provided'}
                    </div>
                  )}
                </div>
              </div>

              {/* Clause Modifications */}
              {addendumDetailsModal.addendum.clauseModifications && addendumDetailsModal.addendum.clauseModifications.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">📋 Clause Modifications</label>
                  <div className="bg-gray-50 p-3 rounded border">
                    {addendumDetailsModal.addendum.clauseModifications.map((mod, index) => (
                      <div key={index} className="mb-3 p-3 bg-white rounded border-l-4 border-blue-300">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">Clause {mod.clauseNumber}</span>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              mod.modificationType === "Modified" ? "bg-orange-100 text-orange-700" :
                              mod.modificationType === "New" ? "bg-green-100 text-green-700" :
                              mod.modificationType === "Removed" ? "bg-red-100 text-red-700" :
                              "bg-blue-100 text-blue-700"
                            }`}>
                              {mod.modificationType === "Modified" ? "🔄 Modified" :
                               mod.modificationType === "New" ? "➕ New" :
                               mod.modificationType === "Removed" ? "❌ Removed" :
                               "📝 Changed"}
                            </span>
                          </div>
                          <button
                            onClick={() => handleViewClauseHistory(mod.clauseNumber, mod.clauseTitle, [mod])}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 cursor-pointer transition-colors"
                            title="View History"
                          >
                            📋 History
                          </button>
                        </div>
                        <div className="text-xs text-gray-600 mb-1">
                          <strong>Details:</strong> {mod.details}
                        </div>
                        {mod.previousValue && mod.newValue && (
                          <div className="text-xs text-gray-500">
                            <span className="line-through">{mod.previousValue}</span> → <span className="text-green-600">{mod.newValue}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploaded Files */}
              {addendumDetailsModal.addendum.uploadedFiles && Object.keys(addendumDetailsModal.addendum.uploadedFiles).length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">📎 Uploaded Documents</label>
                  <div className="space-y-3">
                    {Object.entries(addendumDetailsModal.addendum.uploadedFiles).map(([key, file]) => (
                      <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700">{key}:</span>
                          <span className="text-sm text-gray-800 font-medium">{file.name}</span>
                        </div>
                        <span
                          onClick={() => {
                            if (file.isDemo) {
                              alert("This is a demo file and cannot be opened.");
                            } else if (file.url) {
                              window.open(file.url, '_blank');
                            } else if (file instanceof File) {
                              const url = URL.createObjectURL(file);
                              window.open(url, '_blank');
                            }
                          }}
                          className={`text-sm cursor-pointer transition-colors font-medium ${
                            file.isDemo 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-blue-600 hover:text-blue-800 underline'
                          }`}
                          title={file.isDemo ? 'Demo file - cannot be opened' : 'Click to open in new tab'}
                        >
                          {file.isDemo ? 'Demo File' : 'Open Document'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Version History */}
              {addendumDetailsModal.addendum.versionHistory && addendumDetailsModal.addendum.versionHistory.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">🔄 Version History</label>
                  <div className="bg-gray-50 p-3 rounded border max-h-48 overflow-y-auto">
                    {addendumDetailsModal.addendum.versionHistory.map((version, index) => (
                      <div key={index} className={`mb-3 p-3 bg-white rounded border-l-4 ${
                        version.type === 'addendum' ? 'border-blue-400' :
                        version.type === 'status_change' ? 'border-green-400' :
                        'border-gray-400'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">
                              v{version.versionNumber}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              version.type === 'addendum' ? 'bg-blue-100 text-blue-700' :
                              version.type === 'status_change' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {version.type === 'addendum' ? '📄 Addendum' :
                               version.type === 'status_change' ? '🔄 Status Change' :
                               '📝 Update'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            📅 {new Date(version.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mb-1">
                          <strong>Description:</strong> {version.description}
                        </div>
                        {version.user && (
                          <div className="text-xs text-gray-500">
                            <strong>By:</strong> {version.user}
                          </div>
                        )}
                        {version.changes && (
                          <div className="text-xs text-gray-500">
                            <strong>Changes:</strong> {version.changes}
                          </div>
                        )}
                        {version.legalCompliance && (
                          <div className="text-xs text-gray-500 mt-1">
                            <strong>Risk Level:</strong> 
                            <span className={`ml-1 px-1 py-0.5 rounded text-xs ${
                              version.legalCompliance.riskLevel === 'HIGH' ? 'bg-red-100 text-red-700' :
                              version.legalCompliance.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {version.legalCompliance.riskLevel}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Change Section - For Approvers */}
              {userRole?.toLowerCase() === "approver" && (
                <div className="mb-6 border-t border-gray-200 pt-6">
                  <h4 className="font-semibold text-gray-800 mb-3">Change Addendum Status</h4>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <select
                      className="border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 min-w-[140px]"
                      value={pendingStatusChanges[addendumDetailsModal.addendum.id] || addendumDetailsModal.addendum.status}
                      onChange={(e) => {
                        // Just update the local state, don't submit yet
                        setPendingStatusChanges(prev => ({
                          ...prev,
                          [addendumDetailsModal.addendum.id]: e.target.value
                        }));
                      }}
                    >
                      <option value="Pending">⏳ Pending</option>
                      <option value="Approved">✅ Approved</option>
                      <option value="Rejected">❌ Rejected</option>
                    </select>
                    
                    {pendingStatusChanges[addendumDetailsModal.addendum.id] && pendingStatusChanges[addendumDetailsModal.addendum.id] !== addendumDetailsModal.addendum.status && (
                      <button
                        onClick={() => {
                          const addendumId = addendumDetailsModal.addendum.id;
                          const newStatus = pendingStatusChanges[addendumId];
                          console.log('Status change confirmed:', addendumId, newStatus);
                          if (onAddendumStatusUpdate) {
                            onAddendumStatusUpdate(addendumId, newStatus);
                            // Clear pending change
                            setPendingStatusChanges(prev => {
                              const updated = { ...prev };
                              delete updated[addendumId];
                              return updated;
                            });
                            // Modal stays open - user must manually close
                          }
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Save Status
                      </button>
                    )}
                    
                    <button
                      onClick={() => setAddendumDetailsModal({ open: false, addendum: null })}
                      className="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    Current Status: <span className="font-semibold">{addendumDetailsModal.addendum.status}</span>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-800 text-sm">
                      💡 Select a new status from the dropdown above, then click "Save Status" to apply the change. Use "Close" to exit.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                {(userRole?.toLowerCase() === "checker" || userRole?.toLowerCase() === "checker") && 
                 addendumDetailsModal.addendum.status !== "Approved" && 
                 addendumDetailsModal.addendum.status !== "Rejected" && (
                  <>
                    {!isEditing ? (
                      <button
                        onClick={() => handleEditAddendum(addendumDetailsModal.addendum)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        ✏️ Edit Addendum
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleCancelAddendumEdit}
                          className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveAddendumChanges}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          💾 Save Changes
                        </button>
                      </>
                    )}
                  </>
                )}
                <button
                  onClick={() => setAddendumDetailsModal({ open: false, addendum: null })}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clause History Modal */}
        {clauseHistoryModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg p-6 min-w-[600px] max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Clause History - {clauseHistoryModal.clause.title}</h3>
                <button onClick={() => setClauseHistoryModal({ open: false, clause: null, modifications: [] })} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
              </div>
              
              <p className="text-gray-600 text-sm mb-6">View and manage modifications for this clause.</p>

              {clauseHistoryModal.modifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl mb-2 block">📄</span>
                  <p className="text-lg font-medium">No modifications recorded for this clause.</p>
                  <p className="text-sm">This clause has not been modified by any addendums.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Original Clause Version */}
                  <div className="border border-gray-300 rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-blue-600 font-medium">📋 Original Version</span>
                      <span className="text-xs text-gray-500">(Before any modifications)</span>
                    </div>
                    <div className="text-sm text-gray-700 p-3 bg-white rounded border">
                      {clauseHistoryModal.clause.title || "Original clause content"}
                    </div>
                  </div>
                  
                  {/* Modification History */}
                  {clauseHistoryModal.modifications.map((mod, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">Addendum #{mod.addendumId}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            mod.modificationType === "Modified" ? "bg-orange-100 text-orange-700" :
                            mod.modificationType === "Added" ? "bg-green-100 text-green-700" :
                            mod.modificationType === "Removed" ? "bg-red-100 text-red-700" :
                            "bg-blue-100 text-blue-700"
                          }`}>
                            {mod.modificationType}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(mod.addendumDate).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Previous Version */}
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">Previous Version:</div>
                          <div className="text-sm text-gray-600 p-3 bg-white rounded border border-gray-200">
                            {mod.previousVersion || "Original clause content before this modification"}
                      </div>
                        </div>
                        
                        {/* Current Changes */}
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">Changes Made:</div>
                          <div className="text-sm text-gray-600 p-3 bg-white rounded border border-gray-200">
                            {mod.details}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-xs text-gray-500">
                        <strong>Addendum Title:</strong> {mod.addendumTitle} | 
                        <strong> Status:</strong> {mod.addendumStatus}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setClauseHistoryModal({ open: false, clause: null, modifications: [] })}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
     </div>
   );
 }
 