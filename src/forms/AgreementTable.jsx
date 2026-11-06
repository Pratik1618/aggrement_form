import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileDown,
  FileText,
  Info,
  Lightbulb,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  User,
  X as XIcon,
  XCircle,
} from "lucide-react";
import { useAppState } from "../hooks/useRedux";
import { cn } from "@/lib/utils";
import { statusBadgeClass, priorityBadgeClass } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <h3 className="mb-2 font-semibold text-destructive">Something went wrong</h3>
          <p className="mb-2 text-sm text-destructive">
            An error occurred while rendering this component.
          </p>
          <details className="text-xs text-destructive">
            <summary>Error details</summary>
            <pre className="mt-2 whitespace-pre-wrap">
              {this.state.error?.toString()}
            </pre>
          </details>
          <Button
            size="sm"
            variant="destructive"
            className="mt-2"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

const MODIFICATION_CLASSES = {
  Modified: "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30",
  Added: "bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30",
  New: "bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30",
  Removed: "bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
};
const MODIFICATION_FALLBACK = "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30";

const modificationBadgeClass = (type) => MODIFICATION_CLASSES[type] ?? MODIFICATION_FALLBACK;

const ModificationIcon = ({ type, className }) => {
  if (type === "Modified") return <RefreshCw className={className} />;
  if (type === "Added" || type === "New") return <Plus className={className} />;
  if (type === "Removed") return <XCircle className={className} />;
  return <Pencil className={className} />;
};

const modificationLabel = (type) => {
  if (type === "Modified") return "Modified";
  if (type === "Added" || type === "New") return "New";
  if (type === "Removed") return "Removed";
  return "Changed";
};

const priorityBadge = (priority) => {
  if (!priority) return null;
  return <Badge className={priorityBadgeClass(priority)}>{priority}</Badge>;
};

// Component to render clickable file links
const FileLink = ({ file, label, type }) => {
  if (!file) return <span className="text-xs text-muted-foreground">{label}: Not uploaded</span>;

  const handleFileClick = () => {
    try {
      // Check if it's a real File object or demo data
      if (file instanceof File) {
        // Real file - create object URL
        const url = URL.createObjectURL(file);
        window.open(url, '_blank');
      } else if (file.name && file.size) {
        // Demo data - show file info
        toast.info(`Demo file: ${file.name}`, {
          description: `Size: ${file.size} • Type: ${type}. This is demo data — in a real application this would open the actual file.`,
        });
      } else {
        toast.error('File information not available');
      }
    } catch (error) {
      console.error('Error opening file:', error);
      toast.error('Unable to open file');
    }
  };

  return (
    <button
      type="button"
      onClick={handleFileClick}
      className="text-xs font-medium text-primary underline-offset-2 hover:underline"
      title={`Click to view ${file.name || label} in new tab`}
    >
      {label}
    </button>
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
              <span className="text-xs text-muted-foreground">
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
    return <span className="text-xs text-muted-foreground">No documents uploaded</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {clauseLinks.map(clause => (
        <div key={clause.index}>
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
                  <Tooltip key={modIndex}>
                    <TooltipTrigger asChild>
                      <Badge className={cn(modificationBadgeClass(mod.modificationType), "cursor-help gap-1")}>
                        <ModificationIcon type={mod.modificationType} className="size-3" />
                        {modificationLabel(mod.modificationType)}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="min-w-[200px] text-left">
                      <div className="space-y-1">
                        <div><strong>Addendum:</strong> #{mod.addendumId}</div>
                        <div><strong>Title:</strong> {mod.addendumTitle}</div>
                        <div><strong>Status:</strong> {mod.addendumStatus}</div>
                        <div><strong>Date:</strong> {new Date(mod.addendumDate).toLocaleDateString()}</div>
                        <div><strong>Details:</strong> {mod.details}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}

                {/* View History Button */}
                <Button
                  size="icon-xs"
                  variant="outline"
                  title="View clause history"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowClauseHistory(clause.index, clause.title, clause.modifications);
                  }}
                >
                  <ClipboardList className="size-3" />
                </Button>
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

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
    setTimeout(() => {
      onUpload(agreementId, selectedFile);
      setIsUploading(false);
    }, 1000);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5" /> Upload Final Signed Agreement
          </DialogTitle>
        </DialogHeader>

        <div>
          <Label className="mb-2">Select Final Agreement Document</Label>
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-input bg-muted/30 p-6">
            <FileText className="mb-2 size-8 text-muted-foreground" />
            <Label className="mb-2 cursor-pointer rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90">
              Choose Final Agreement
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
            </Label>
            <p className="text-center text-xs text-muted-foreground">
              PDF, DOCX, JPG, JPEG, PNG (Max 10MB)
            </p>
          </div>
        </div>

        {selectedFile && (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-500/30 dark:bg-green-500/10">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-800 dark:text-green-400">
                Selected: {selectedFile.name}
              </span>
            </div>
          </div>
        )}

        {uploadError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{uploadError}</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
            {isUploading ? "Uploading..." : "Upload & Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Status History Modal
function StatusHistoryModal({ open, onClose, history, title }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {history.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No status history available yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry, index) => (
              <div key={index} className="rounded-lg border bg-muted/30 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Badge className={statusBadgeClass(entry.status)}>{entry.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                {entry.notes && (
                  <p className="mb-2 text-sm text-foreground">{entry.notes}</p>
                )}
                {entry.date && (
                  <p className="text-xs text-muted-foreground">Date: {entry.date}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Agreement Details Modal with Actions
function DetailsModal({ open, onClose, agreement, onPriorityChange, onStatusChange, onFinalAgreementUpload, addendums = [], userRole = "checker", onAddendumStatusUpdate, pendingStatusChanges, setPendingStatusChanges, onEditAddendum, onViewAddendum }) {
  const [localPriority, setLocalPriority] = useState(agreement?.originalAgreement?.priority || "Low");
  const [localStatus, setLocalStatus] = useState(agreement?.originalStatus || agreement?.status || "Execution Pending");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [currentTab, setCurrentTab] = useState("agreement"); // "agreement" or "addendums"
  const [currentAddendumIndex, setCurrentAddendumIndex] = useState(0);
  const [showAddendumList, setShowAddendumList] = useState(false);

  React.useEffect(() => {
    if (agreement) {
      setLocalPriority(agreement.originalAgreement?.priority || "Low");
      setLocalStatus(agreement.originalStatus || agreement.status || "Execution Pending");
      setSelectedFile(null);
      setUploadError("");
      setCurrentTab("agreement");
      setCurrentAddendumIndex(0);
    }
  }, [agreement]);

  if (!open) return null;

  // Handle case where agreement is null or undefined
  if (!agreement) {
    console.error("DetailsModal: agreement is null or undefined");
    return (
      <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="sm:max-w-md text-center">
          <h3 className="mb-4 text-xl font-bold text-destructive">Error</h3>
          <p className="mb-4 text-muted-foreground">Unable to load agreement details. The agreement data is missing.</p>
          <Button onClick={onClose}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Handle case where originalAgreement is missing
  if (!agreement.originalAgreement) {
    console.error("DetailsModal: agreement.originalAgreement is missing");
    return (
      <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="sm:max-w-md text-center">
          <h3 className="mb-4 text-xl font-bold text-destructive">Error</h3>
          <p className="mb-4 text-muted-foreground">Unable to load agreement details. The original agreement data is missing.</p>
          <Button onClick={onClose}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Get addendums for this agreement
  const agreementAddendums = (addendums || []).filter(addendum =>
    addendum.parentAgreementId === agreement.id
  );

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
      const currentStatus = agreement.status || "Execution Pending";
      let nextStatus = "Execution Pending";

      if (currentStatus === "Execution Pending") {
        nextStatus = "Executed";
      } else if (currentStatus === "Executed") {
        nextStatus = "Under Process with Client";
      } else if (currentStatus === "Under Process with Client") {
        nextStatus = "Approved";
      } else if (currentStatus === "Approved") {
        nextStatus = "Approved";
      }

      onStatusChange(agreement.id, nextStatus);
      onClose();
    }
  };

  const handleReject = () => {
    onStatusChange(agreement.id, "Execution Pending");
    onClose();
  };

  const handleSaveChanges = () => {
    onPriorityChange(agreement.id, localPriority);
    onStatusChange(agreement.id, localStatus);
    toast.success("Changes saved successfully!");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
              <ArrowLeft className="size-4" />
              Back to Agreements
            </Button>
            <DialogTitle>Contract Details - {agreement.id}</DialogTitle>
          </div>
        </DialogHeader>

        {/* Page Navigation */}
        <div className="flex items-center justify-between border-b pb-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentTab("agreement")}
              className={cn(
                "border-b-2 px-4 py-2 text-sm font-medium",
                currentTab === "agreement"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Agreement Details
            </button>
            <button
              onClick={() => setCurrentTab("addendums")}
              className={cn(
                "flex items-center gap-1 border-b-2 px-4 py-2 text-sm font-medium",
                currentTab === "addendums"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="size-3.5" /> Addendums ({agreementAddendums.length})
            </button>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (currentTab === "addendums") {
                  setCurrentTab("agreement");
                } else {
                  setCurrentAddendumIndex(Math.max(0, currentAddendumIndex - 1));
                }
              }}
              disabled={agreementAddendums.length === 0 || (currentTab === "agreement" && currentAddendumIndex === 0)}
            >
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (currentTab === "agreement") {
                  setCurrentTab("addendums");
                } else {
                  setCurrentAddendumIndex(Math.min(agreementAddendums.length - 1, currentAddendumIndex + 1));
                }
              }}
              disabled={agreementAddendums.length === 0 || (currentTab === "addendums" && currentAddendumIndex === agreementAddendums.length - 1)}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Page Content */}
        {currentTab === "agreement" && (
          <>
            <p className="text-sm text-muted-foreground">Review and approve the agreement</p>

            {/* Agreement Information */}
            <div className="grid grid-cols-2 gap-4 text-sm">
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
            <div>
              <h4 className="mb-3 text-lg font-semibold">Contact Information</h4>
              <div className="grid grid-cols-2 gap-6">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
                  <h5 className="mb-3 font-medium text-blue-800 dark:text-blue-400">I Smart Contact</h5>
                  <div className="space-y-2 text-sm">
                    <div><b>Name:</b> {agreement.originalAgreement?.contactInfo?.name || agreement.contactInfo?.name || "Not specified"}</div>
                    <div><b>Phone:</b> {agreement.originalAgreement?.contactInfo?.phone || agreement.contactInfo?.phone || "Not specified"}</div>
                    <div><b>Email:</b> {agreement.originalAgreement?.contactInfo?.email || agreement.contactInfo?.email || "Not specified"}</div>
                  </div>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-500/30 dark:bg-green-500/10">
                  <h5 className="mb-3 font-medium text-green-800 dark:text-green-400">Client Contact</h5>
                  <div className="space-y-2 text-sm">
                    <div><b>Name:</b> {agreement.originalAgreement?.contactInfo?.clientName || agreement.contactInfo?.clientName || "Not specified"}</div>
                    <div><b>Phone:</b> {agreement.originalAgreement?.contactInfo?.clientPhone || agreement.contactInfo?.clientPhone || "Not specified"}</div>
                    <div><b>Email:</b> {agreement.originalAgreement?.contactInfo?.clientEmail || agreement.contactInfo?.clientEmail || "Not specified"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div>
              <h4 className="mb-3 text-sm font-semibold">Uploaded Documents</h4>
              <div className="space-y-3">
                {agreement.originalAgreement?.uploadStatuses ? (
                  Object.entries(agreement.originalAgreement.uploadStatuses).map(([docType, status]) => (
                    <div key={docType} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                      <div className="flex items-center gap-3">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="font-medium">{docType}</span>
                        <Badge className={status.uploaded ? statusBadgeClass("Approved") : statusBadgeClass("Rejected")}>
                          {status.uploaded ? "Uploaded" : "Missing"}
                        </Badge>
                      </div>
                      {status.uploaded && status.file && (
                        <span className="text-sm text-muted-foreground">{status.file.name}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No document information available</span>
                )}
              </div>
            </div>

            {/* Important Clauses Section */}
            <div>
              <h4 className="mb-3 text-sm font-semibold">Important Clauses</h4>
              <div className="space-y-2">
                {(() => {
                  const importantClauses = agreement.originalAgreement?.importantClauses || agreement.importantClauses;
                  const clauses = agreement.originalAgreement?.clauses || agreement.clauses;
                  const uploadStatuses = agreement.originalAgreement?.uploadStatuses || agreement.uploadStatuses;

                  const allClauses = [];

                  if (importantClauses && Array.isArray(importantClauses)) {
                    importantClauses.forEach((clause) => {
                      let hasDocuments = false;
                      if (typeof clause === 'string') {
                        hasDocuments = false;
                      } else if (clause && clause.title) {
                        hasDocuments = (clause.documents && Array.isArray(clause.documents) && clause.documents.length > 0) ||
                                       (clause.file && clause.file !== null);
                      }
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
                    clauses.forEach((clause) => {
                      let hasDocuments = false;
                      if (typeof clause === 'string') {
                        hasDocuments = false;
                      } else if (clause && clause.title) {
                        hasDocuments = (clause.documents && Array.isArray(clause.documents) && clause.documents.length > 0) ||
                                       (clause.file && clause.file !== null);
                      }
                      if (hasDocuments) {
                        if (typeof clause === 'string') {
                          allClauses.push({ title: clause, type: 'regular' });
                        } else if (clause && clause.title) {
                          allClauses.push({ ...clause, type: 'regular' });
                        }
                      }
                    });
                  }

                  const hasAnyUploadedDocuments = uploadStatuses && Object.keys(uploadStatuses).some(docType =>
                    uploadStatuses[docType]?.uploaded
                  );

                  if (allClauses.length === 0 || !hasAnyUploadedDocuments) {
                    return <span className="text-sm text-muted-foreground">No clauses with documents uploaded</span>;
                  }

                  return allClauses.map((clause, idx) => (
                    <div
                      key={idx}
                      className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-50 p-3 transition-colors hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20"
                      onClick={() => {
                        const clauseTitle = clause.title;

                        if (clause.documents && Array.isArray(clause.documents) && clause.documents.length > 0) {
                          const firstDoc = clause.documents[0];
                          toast.info(`Opening document: ${firstDoc.name}`, { description: "This is demo data. In a real application, this would open the actual document." });
                        } else if (clause.file && clause.file !== null) {
                          toast.info(`Opening document: ${clause.file.name}`, { description: "This is demo data. In a real application, this would open the actual document." });
                        } else {
                          const clauseName = clauseTitle.toLowerCase();
                          const matchingDocType = Object.keys(uploadStatuses || {}).find(docType =>
                            uploadStatuses[docType]?.uploaded &&
                            docType.toLowerCase().includes(clauseName.split(' ')[0].toLowerCase())
                          );

                          if (matchingDocType && uploadStatuses[matchingDocType].file) {
                            const file = uploadStatuses[matchingDocType].file;
                            toast.info(`Opening document: ${file.name}`, { description: "This is demo data. In a real application, this would open the actual document." });
                          } else {
                            toast.info(`Clause: ${clauseTitle}`, { description: "No document uploaded for this clause." });
                          }
                        }
                      }}
                    >
                      <ClipboardList className="size-4 text-blue-600 dark:text-blue-400" />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{clause.title}</span>
                        {clause.placeholder && (
                          <div className="mt-1 text-xs text-muted-foreground">{clause.placeholder}</div>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Priority and Status Controls */}
            {userRole?.toLowerCase() === "approver" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2">Priority</Label>
                  <Select value={localPriority} onValueChange={setLocalPriority}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2">Status</Label>
                  <Select value={localStatus} onValueChange={setLocalStatus}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Execution Pending">Execution Pending</SelectItem>
                      <SelectItem value="Executed">Executed</SelectItem>
                      <SelectItem value="Under Process with Client">Under Process with Client</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Status Display for Checker Role */}
            {userRole?.toLowerCase() === "checker" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2">Priority</Label>
                  <div className="rounded-md border bg-muted/30 p-2 text-sm text-muted-foreground">
                    {agreement.priority || "Not Set"}
                  </div>
                </div>
                <div>
                  <Label className="mb-2">Status</Label>
                  <div className="rounded-md border bg-muted/30 p-2 text-sm text-muted-foreground">
                    {agreement.status || "Not Set"}
                  </div>
                </div>
              </div>
            )}

            {/* Upload Final Agreement - Only for Approver Role */}
            {userRole?.toLowerCase() === "approver" && (
              <div>
                <Label className="mb-2">Upload Final Agreement *</Label>
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-input bg-muted/30 p-6">
                  <FileText className="mb-2 size-8 text-muted-foreground" />
                  <Label className="mb-2 cursor-pointer rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90">
                    Choose File
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                  </Label>
                  <p className="text-center text-xs text-muted-foreground">
                    Max size: 10MB • Allowed: .pdf, .docx, .jpg, .jpeg, .png
                  </p>
                </div>

                {selectedFile && (
                  <div className="mt-3 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-500/30 dark:bg-green-500/10">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-800 dark:text-green-400">
                        Selected: {selectedFile.name}
                      </span>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3">
                    <p className="text-sm text-destructive">{uploadError}</p>
                  </div>
                )}
              </div>
            )}

            {/* Final Agreement Display for Checker Role */}
            {userRole?.toLowerCase() === "checker" && agreement.finalAgreement && (
              <div>
                <Label className="mb-2">Final Agreement Document</Label>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="size-6 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{agreement.finalAgreement.name}</p>
                      <p className="text-sm text-muted-foreground">Uploaded by approver</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons - Only for Approver Role */}
            {userRole?.toLowerCase() === "approver" && (
              <div className="flex justify-end gap-3">
                <Button size="lg" onClick={handleSaveChanges} className="gap-2">
                  <Save className="size-4" /> Save Changes
                </Button>
              </div>
            )}

            {/* Read-only Message for Checker Role */}
            {userRole?.toLowerCase() === "checker" && (
              <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/30 py-4 text-center text-sm text-muted-foreground">
                <Info className="size-4" />
                You can view agreement details and addendums, but only approvers can modify status and priority.
              </div>
            )}
          </>
        )}

        {currentTab === "addendums" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">View all addendums and modifications for this contract</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="size-3" /> Addendums are separate modifications that do not affect the original contract
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {agreementAddendums.length} addendum{agreementAddendums.length !== 1 ? 's' : ''} total
                </span>
                <Button size="sm" variant="secondary" onClick={() => setShowAddendumList(!showAddendumList)}>
                  {showAddendumList ? 'Hide List' : 'Show All'}
                </Button>
              </div>
            </div>

            {agreementAddendums.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <FileText className="mx-auto mb-2 size-10" />
                <p className="text-lg font-medium">No addendums found</p>
                <p className="text-sm">This contract has no addendums or modifications yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Addendum List View */}
                {showAddendumList && (
                  <div className="rounded-lg bg-muted/30 p-4">
                    <h3 className="mb-4 text-lg font-semibold">Contract Modifications</h3>
                    <div className="space-y-3">
                      {agreementAddendums.map((addendum, index) => (
                        <div
                          key={addendum.id}
                          className={cn(
                            "cursor-pointer rounded-lg border p-4 transition-colors",
                            currentAddendumIndex === index
                              ? 'border-primary bg-primary/5'
                              : 'bg-card hover:border-foreground/20'
                          )}
                          onClick={() => setCurrentAddendumIndex(index)}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-primary">#{addendum.id}</span>
                              <span className="text-sm font-medium">
                                {typeof addendum.title === 'string' ? addendum.title : 'Untitled Addendum'}
                              </span>
                              <Badge className={statusBadgeClass(addendum.status)}>{addendum.status}</Badge>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="size-3.5" /> {new Date(addendum.submittedDate).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-muted-foreground">Created by:</span>
                              <span className="ml-2 inline-flex items-center gap-1"><User className="size-3.5" /> {addendum.submittedBy}</span>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Effective Date:</span>
                              <span className="ml-2">
                                {addendum.effectiveDate ? new Date(addendum.effectiveDate).toLocaleDateString() : "Not specified"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 text-sm text-muted-foreground">
                            <span className="font-medium">Summary:</span>
                            <span className="ml-2">
                              {typeof addendum.description === 'string'
                                ? addendum.description.substring(0, 120) + '...'
                                : 'No description available'}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{addendum.clauseModifications?.length || 0} clause modifications</span>
                              <span>•</span>
                              <span>{Object.keys(addendum.uploadedFiles || {}).length} documents</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
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
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <Download className="size-3" /> Quick Download
                              </button>

                              {userRole === "checker" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditAddendum?.(addendum);
                                  }}
                                  className="flex items-center gap-1 text-xs text-orange-600 hover:underline dark:text-orange-400"
                                  title="Edit this addendum"
                                >
                                  <Pencil className="size-3" /> Edit
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
                {agreementAddendums[currentAddendumIndex] && (() => {
                  const addendum = agreementAddendums[currentAddendumIndex];
                  return (
                    <div key={addendum.id} className="rounded-lg border bg-card p-6 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-bold text-primary">#{addendum.id}</span>
                          <Badge className={cn(statusBadgeClass(pendingStatusChanges[addendum.id] || addendum.status), "text-sm")}>
                            {pendingStatusChanges[addendum.id] || addendum.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="size-3.5" /> {new Date(addendum.submittedDate).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="mb-4 grid grid-cols-2 gap-6 text-sm">
                        <div>
                          <span className="font-semibold text-muted-foreground">Title:</span>
                          <p className="mt-1">{addendum.title}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-muted-foreground">Submitted By:</span>
                          <p className="mt-1 flex items-center gap-1"><User className="size-3.5" /> {addendum.submittedBy}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-muted-foreground">Effective Date:</span>
                          <p className="mt-1">{addendum.effectiveDate ? new Date(addendum.effectiveDate).toLocaleDateString() : "Not specified"}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-muted-foreground">Reason:</span>
                          <p className="mt-1">{addendum.reason || "Not specified"}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-muted-foreground">Impact Assessment:</span>
                          <p className="mt-1">{addendum.impact || "Not specified"}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-muted-foreground">Branches:</span>
                          <p className="mt-1">{addendum.branches && Array.isArray(addendum.branches) ? addendum.branches.join(", ") : "All Branches"}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <span className="text-sm font-semibold text-muted-foreground">Summary of Changes:</span>
                        <p className="mt-1 text-sm leading-relaxed">{addendum.description}</p>
                      </div>

                      {addendum.clauseModifications && Array.isArray(addendum.clauseModifications) && addendum.clauseModifications.length > 0 && (
                        <div className="mb-4">
                          <span className="text-sm font-semibold text-muted-foreground">Clause Modifications:</span>
                          <div className="mt-2 space-y-2">
                            {addendum.clauseModifications.map((mod, modIndex) => (
                              <div key={modIndex} className="rounded-lg border-l-4 border-blue-400 bg-muted/30 p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Clause {mod.clauseNumber}: {mod.details}</span>
                                  <Badge className={cn(modificationBadgeClass(mod.modificationType), "gap-1")}>
                                    <ModificationIcon type={mod.modificationType} className="size-3" />
                                    {modificationLabel(mod.modificationType)}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {addendum.uploadedFiles && Object.keys(addendum.uploadedFiles).length > 0 && (
                        <div className="mb-4">
                          <span className="text-sm font-semibold text-muted-foreground">Documents:</span>
                          <div className="mt-2 space-y-2">
                            {Object.entries(addendum.uploadedFiles).map(([key, file]) => (
                              <div key={key} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-muted-foreground">{key}:</span>
                                  <span className="text-sm">{file.name}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (file.isDemo) {
                                      toast.error("This is a demo file and cannot be opened.");
                                    } else if (file.url) {
                                      window.open(file.url, '_blank');
                                    } else if (file instanceof File) {
                                      const url = URL.createObjectURL(file);
                                      window.open(url, '_blank');
                                    }
                                  }}
                                  className={cn(
                                    "text-sm font-medium",
                                    file.isDemo ? 'cursor-not-allowed text-muted-foreground' : 'text-primary hover:underline'
                                  )}
                                  title={file.isDemo ? 'Demo file - cannot be opened' : 'Click to open in new tab'}
                                >
                                  {file.isDemo ? 'Demo File' : 'Open Document'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Change Status Section - Only for Approver Role */}
                      {userRole?.toLowerCase() === "approver" && (
                        <div className="mb-4">
                          <h4 className="mb-3 text-sm font-semibold">Change Status</h4>

                          <div className="mb-3">
                            <Select
                              value={pendingStatusChanges[addendum.id] || addendum.status || "Pending Review"}
                              onValueChange={(newStatus) => {
                                setPendingStatusChanges(prev => ({
                                  ...prev,
                                  [addendum.id]: newStatus
                                }));
                                if (onAddendumStatusUpdate) {
                                  onAddendumStatusUpdate(addendum.id, newStatus);
                                }
                              }}
                            >
                              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pending Review">Pending Review</SelectItem>
                                <SelectItem value="Under Review">Under Review</SelectItem>
                                <SelectItem value="Approved">Approved</SelectItem>
                                <SelectItem value="Rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="mb-3 flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Current Status: </span>
                            <Badge className={statusBadgeClass(pendingStatusChanges[addendum.id] || addendum.status)}>
                              {pendingStatusChanges[addendum.id] || addendum.status || "Pending Review"}
                            </Badge>
                          </div>

                          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
                            <Lightbulb className="size-4 text-blue-600 dark:text-blue-400" />
                            <p className="text-xs text-blue-800 dark:text-blue-400">
                              Select a new status from the dropdown above to change the addendum status.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex justify-between border-t pt-4">
                        <Button size="sm" variant="secondary" onClick={onClose}>
                          Close
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-2 bg-green-600 hover:bg-green-700"
                            onClick={() => {
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
                          >
                            <Download className="size-4" /> Download Document
                          </Button>
                          <Button size="sm" className="gap-2" onClick={() => onViewAddendum?.(addendum)}>
                            <Eye className="size-4" /> View Full Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AgreementTable({ agreements = [], onStatusUpdate, onAddendumStatusUpdate, userRole = "checker", onCreateAddendum, onEditAgreement, onAddendumSubmit }) {
  const { addendums } = useAppState();

  const [filters, setFilters] = useState({
    client: "",
    city: "",
    state: "",
    fromDate: "",
    toDate: "",
    addendumsFilter: "all" // "all", "with", "without"
  });
  const [showFinalUpload, setShowFinalUpload] = useState(null);
  const [addendumDetailsModal, setAddendumDetailsModal] = useState({ open: false, addendum: null });
  const [clauseHistoryModal, setClauseHistoryModal] = useState({ open: false, clause: null, modifications: [] });
  const [editingAddendum, setEditingAddendum] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingStatusChanges, setPendingStatusChanges] = useState({});
  const [topScrollRef, setTopScrollRef] = useState(null);
  const [bottomScrollRef, setBottomScrollRef] = useState(null);

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
    if (!agreement.status) {
      return "Execution Pending";
    }
    if (agreement.status === "Execution Pending") {
      return "Execution Pending";
    }
    if (agreement.status === "Executed") {
      return "Executed";
    }
    if (agreement.status === "Under Process with Client") {
      return "Under Process with Client";
    }
    if (agreement.status === "Approved") {
      return "Approved";
    }
    return "Execution Pending";
  };

  // Transform agreement data from form structure to table structure
  const transformedData = agreements.map((agreement, index) => {
    const woPoLoiInfo = [];
    if (agreement.uploadStatuses?.WO?.uploaded) woPoLoiInfo.push("WO");
    if (agreement.uploadStatuses?.PO?.uploaded) woPoLoiInfo.push("PO");
    if (agreement.uploadStatuses?.LOI?.uploaded) woPoLoiInfo.push("LOI");
    if (agreement.uploadStatuses?.EmailApproval?.uploaded) woPoLoiInfo.push("Email Approval");
    const woPoLoiText = woPoLoiInfo.length > 0 ? woPoLoiInfo.join(" / ") : "None uploaded";

    const importantClausesSummary = agreement.importantClauses && agreement.importantClauses.length > 0
      ? agreement.importantClauses.slice(0, 3).map(clause =>
          typeof clause === 'string' ? clause : clause.title
        ).join(", ")
      : "No clauses";

    const allBranches = (agreement.selectedBranches && agreement.selectedBranches.length > 0)
      ? agreement.selectedBranches.map(branch => typeof branch === 'string' ? branch : branch.name).join(", ")
      : "Not specified";

    const submittedDate = new Date(agreement.submittedDate);
    const daysDiff = Math.floor((new Date() - submittedDate) / (1000 * 60 * 60 * 24));
    let priority = "Low";
    if (daysDiff > 5) priority = "High";
    else if (daysDiff >= 3) priority = "Medium";

    const addendumsCount = (addendums?.addendums || []).filter(addendum => {
      return addendum.parentAgreementId === agreement.id;
    }).length;

    return {
      id: agreement.id || `AGR${String(index + 1).padStart(3, '0')}`,
      client: agreement.selectedClient || "Unknown Client",
      location: allBranches,
      site: allBranches,
      city: allBranches,
      state: "Not specified",
      wo: woPoLoiText,
      priority: agreement.priority || priority,
      checker: agreement.submittedBy || "Unknown",
      entityType: agreement.entityType || "single",
      date: agreement.submittedDate || new Date().toISOString().split('T')[0],
      status: getCurrentStatus(agreement),
      originalStatus: agreement.status,
      importantClauses: importantClausesSummary,
      finalAgreement: agreement.finalAgreement || null,
      originalAgreement: agreement,
      addendumsCount,
    };
  });

  const [data, setData] = useState(transformedData);
  const [details, setDetails] = useState({ open: false, agreement: null });
  const [statusHistoryModal, setStatusHistoryModal] = useState({ open: false, history: [], title: "" });

  React.useEffect(() => {
    setData(transformedData);
  }, [agreements]);

  const uniqueClients = [ ...new Set(data.map(row => row.client)) ];
  const uniqueCities = [ ...new Set(data.map(row => row.city)) ];
  const uniqueStates = [ ...new Set(data.map(row => row.state)) ];

  const handlePriorityChange = (agreementId, newPriority) => {
    setData(prev => prev.map(row =>
      row.id === agreementId ? { ...row, priority: newPriority } : row
    ));

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
            statusProgress: { notes: "", date: "" }
          };
        }
      }
      return row;
    }));
  };

  // Handle editing agreement
  const handleEditAgreement = (agreement) => {
    if (onCreateAddendum) {
      onCreateAddendum(agreement, 'edit');
    }
  };

  // Handle creating new addendum
  const handleCreateAddendum = (agreement) => {
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
    setData(prev => prev.map(row =>
      row.id === agreementId
        ? {
            ...row,
            status: "Final Agreement Uploaded",
            finalAgreement: file
          }
        : row
    ));

    if (onStatusUpdate) {
      const approvedDate = new Date().toISOString().split('T')[0];
      onStatusUpdate(agreementId, "Final Agreement Uploaded", approvedDate, file);
    }
  };

  // Handler for final agreement upload
  const handleFinalAgreementUpload = (agreementId, file) => {
    setData(prev => prev.map(row =>
      row.id === agreementId
        ? {
            ...row,
            status: "Final Agreement Uploaded",
            finalAgreement: file
          }
        : row
    ));

    if (onStatusUpdate) {
      const approvedDate = new Date().toISOString().split('T')[0];
      onStatusUpdate(agreementId, "Final Agreement Uploaded", approvedDate, file);
    }

    setShowFinalUpload(null);
  };

  // Handler for viewing a specific addendum
  const handleViewAddendum = (addendum) => {
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
    if (onCreateAddendum) {
      onCreateAddendum(addendum, 'edit');
    }
  };

  // Handler for saving addendum changes
  const handleSaveAddendumChanges = () => {
    if (editingAddendum) {
      setAddendumDetailsModal(prev => ({
        ...prev,
        addendum: editingAddendum
      }));

      setIsEditing(false);
      setEditingAddendum(null);
    }
  };

  // Handler for canceling addendum edit
  const handleCancelAddendumEdit = () => {
    setIsEditing(false);
    setEditingAddendum(null);
  };

  // Filtering logic (dropdowns and date range)
  const filtered = data.filter(row => {
    if (userRole?.toLowerCase() === "checker") {
      return row.checker === "checker";
    }

    const clientMatch = !filters.client || row.client === filters.client;
    const cityMatch = !filters.city || row.city === filters.city;
    const stateMatch = !filters.state || row.state === filters.state;

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
    return dateB - dateA;
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

    let filename = "agreements";
    if (filters.fromDate || filters.toDate) {
      const fromDateStr = filters.fromDate ? filters.fromDate.replace(/-/g, '') : 'start';
      const toDateStr = filters.toDate ? filters.toDate.replace(/-/g, '') : 'end';
      filename += `_${fromDateStr}_to_${toDateStr}`;
    }
    filename += ".pdf";

    doc.save(filename);
  };

  const [progressNotes, setProgressNotes] = useState({});
  const [statusDates, setStatusDates] = useState({});

  const getDocumentStatus = (agreement, docType) => {
    if (!agreement.uploadStatuses || !agreement.uploadStatuses[docType] || !agreement.uploadStatuses[docType].uploaded) {
      return null;
    }

    return (
      <span className="text-xs font-medium text-primary underline-offset-2 hover:underline">
        {docType}
      </span>
    );
  };

  const getImportantClauses = (agreement, addendums = []) => {
    try {
      if (!agreement.importantClauses || agreement.importantClauses.length === 0) {
        return <span className="text-xs text-muted-foreground">No clauses specified</span>;
      }

      const clausesWithDocuments = agreement.importantClauses.filter(clause => {
        if (!clause) return false;

        if (typeof clause === 'object' && clause.documents && Array.isArray(clause.documents) && clause.documents.length > 0) {
          return true;
        }

        if (typeof clause === 'object' && clause.file && clause.file !== null) {
          return true;
        }

        if (typeof clause === 'string') {
          return false;
        }

        return false;
      });

      const hasAnyUploadedDocuments = agreement.uploadStatuses && Object.keys(agreement.uploadStatuses).some(docType =>
        agreement.uploadStatuses[docType]?.uploaded
      );

      if (clausesWithDocuments.length === 0 || !hasAnyUploadedDocuments) {
        return <span className="text-xs text-muted-foreground">No clauses with documents uploaded</span>;
      }

      return (
        <div className="space-y-1">
          {clausesWithDocuments.slice(0, 3).map((clause, index) => {
            if (!clause) {
              return null;
            }

            if (typeof clause === 'object' && clause !== null) {
              if (typeof clause.title !== 'string' && typeof clause.content !== 'string') {
                console.warn(`Clause ${index} has no valid string properties:`, clause);
                return null;
              }
            }
            const clauseIndex = agreement.importantClauses.indexOf(clause);
            const clauseModifications = [];

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
              <div key={index} className={cn(
                "flex items-center gap-2 rounded-lg p-2 transition-colors",
                hasModifications && "border border-yellow-200 bg-yellow-50 dark:border-yellow-500/30 dark:bg-yellow-500/10"
              )}>
                <button
                  type="button"
                  className={cn(
                    "text-xs font-medium text-primary underline-offset-2 hover:underline",
                    hasModifications && "font-semibold text-orange-700 dark:text-orange-400"
                  )}
                  onClick={() => {
                    const clauseTitle = typeof clause === 'string' ? clause : (clause.title || 'Untitled Clause');

                    if (typeof clause === 'object' && clause.documents && Array.isArray(clause.documents) && clause.documents.length > 0) {
                      const firstDoc = clause.documents[0];
                      toast.info(`Opening document: ${firstDoc.name}`, { description: "This is demo data. In a real application, this would open the actual document." });
                    } else if (typeof clause === 'object' && clause.file && clause.file !== null) {
                      toast.info(`Opening document: ${clause.file.name}`, { description: "This is demo data. In a real application, this would open the actual document." });
                    } else if (typeof clause === 'string') {
                      const clauseName = clause.toLowerCase();
                      const matchingDocType = Object.keys(agreement.uploadStatuses || {}).find(docType =>
                        agreement.uploadStatuses[docType]?.uploaded &&
                        docType.toLowerCase().includes(clauseName.split(' ')[0].toLowerCase())
                      );

                      if (matchingDocType && agreement.uploadStatuses[matchingDocType].file) {
                        const file = agreement.uploadStatuses[matchingDocType].file;
                        toast.info(`Opening document: ${file.name}`, { description: "This is demo data. In a real application, this would open the actual document." });
                      } else {
                        toast.info(`Clause: ${clauseTitle}`, { description: "No document uploaded for this clause." });
                      }
                    } else {
                      toast.info(`Clause: ${clauseTitle}`, { description: "No document uploaded for this clause." });
                    }
                  }}
                  title={`Click to view details for: ${typeof clause === 'string' ? clause : (clause.title || 'Untitled Clause')}`}
                >
                  {(() => {
                    if (typeof clause === 'string') {
                      return clause;
                    } else if (typeof clause === 'object' && clause !== null) {
                      if (typeof clause.title === 'string') {
                        return clause.title;
                      } else if (typeof clause.content === 'string') {
                        return clause.content;
                      } else {
                        return 'Untitled Clause';
                      }
                    } else {
                      return 'Untitled Clause';
                    }
                  })()}
                </button>

                {hasModifications && (
                  <div className="flex items-center gap-1">
                    {clauseModifications.map((mod, modIndex) => (
                      <Tooltip key={modIndex}>
                        <TooltipTrigger asChild>
                          <Badge className={cn(modificationBadgeClass(mod.modificationType), "cursor-help gap-1")}>
                            <ModificationIcon type={mod.modificationType} className="size-3" />
                            {modificationLabel(mod.modificationType)}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="min-w-[250px] text-left">
                          <div className="space-y-1">
                            <div><strong>Addendum:</strong> #{mod.addendumId}</div>
                            <div><strong>Title:</strong> {mod.addendumTitle}</div>
                            <div><strong>Status:</strong> {mod.addendumStatus}</div>
                            <div><strong>Date:</strong> {new Date(mod.addendumDate).toLocaleDateString()}</div>
                            <div className="mt-2 border-t pt-1">
                              <strong>Previous Version:</strong>
                              <div className="mt-1 rounded bg-muted p-2 text-xs">
                                {mod.previousVersion || "Original clause content before modification"}
                              </div>
                            </div>
                            <div className="mt-2 border-t pt-1">
                              <strong>Current Changes:</strong>
                              <div className="mt-1 rounded bg-muted p-2 text-xs">
                                {mod.details}
                              </div>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}

                    <Button
                      size="icon-xs"
                      variant="outline"
                      title="View complete clause history and previous versions"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewClauseHistory(clauseIndex, clause.title || clause, clauseModifications);
                      }}
                    >
                      <ClipboardList className="size-3" />
                    </Button>

                    {userRole === "checker" && (
                      <Button
                        size="icon-xs"
                        variant="outline"
                        className="text-orange-600 dark:text-orange-400"
                        title="Edit this addendum"
                        onClick={(e) => {
                          e.stopPropagation();
                          const addendum = clauseModifications[0];
                          if (addendum) {
                            const fullAddendum = (addendums || []).find(add => add.id === addendum.addendumId);
                            if (fullAddendum) {
                              handleEditAddendum(fullAddendum);
                            }
                          }
                        }}
                      >
                        <Pencil className="size-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    } catch (error) {
      console.error("Error in getImportantClauses:", error);
      return <span className="text-xs text-destructive">Error loading clauses</span>;
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
    toast.success("Progress saved successfully!");
  };

  // Handle addendum status updates
  const handleAddendumStatusUpdate = (addendumId, newStatus) => {
    toast.success(`Addendum status updated to ${newStatus} successfully!`);
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" className="gap-2" onClick={handleExportExcel}>
          <FileDown className="size-4" /> Export Excel
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleExportPDF}>
          <FileDown className="size-4" /> Export PDF
        </Button>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Lightbulb className="size-4" /> Use date filters above to export agreements within a specific date range
        </div>
      </div>
      <div className="mb-8 rounded-2xl border bg-card p-6 shadow-sm">
        {/* Show filters for all roles now that checkers can see agreements */}
        {userRole?.toLowerCase() === "checker" && (
          <div className="mb-4 flex flex-wrap gap-3">
            <Select value={filters.client || "all"} onValueChange={(v) => setFilters(f => ({ ...f, client: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Clients" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {uniqueClients.map(client => <SelectItem key={client} value={client}>{client}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.city || "all"} onValueChange={(v) => setFilters(f => ({ ...f, city: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Cities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {uniqueCities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.state || "all"} onValueChange={(v) => setFilters(f => ({ ...f, state: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All States" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {uniqueStates.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap text-sm">From Date:</Label>
              <Input
                type="date"
                className="w-auto"
                value={filters.fromDate}
                onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap text-sm">To Date:</Label>
              <Input
                type="date"
                className="w-auto"
                value={filters.toDate}
                onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))}
              />
            </div>
            <Select value={filters.addendumsFilter} onValueChange={(v) => setFilters(f => ({ ...f, addendumsFilter: v }))}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contracts</SelectItem>
                <SelectItem value="with">With Addendums</SelectItem>
                <SelectItem value="without">Without Addendums</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="secondary"
              onClick={() => setFilters({ client: "", city: "", state: "", fromDate: "", toDate: "", addendumsFilter: "all" })}
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Filter Summary - Show for all roles now */}
        {(filters.client || filters.city || filters.state || filters.fromDate || filters.toDate) && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
            <div className="text-sm text-blue-800 dark:text-blue-400">
              <span className="font-medium">Active Filters:</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {filters.client && <Badge variant="secondary">Client: {filters.client}</Badge>}
                {filters.city && <Badge variant="secondary">City: {filters.city}</Badge>}
                {filters.state && <Badge variant="secondary">State: {filters.state}</Badge>}
                {filters.addendumsFilter !== "all" && (
                  <Badge variant="secondary">{filters.addendumsFilter === "with" ? "With Addendums" : "Without Addendums"}</Badge>
                )}
                {filters.fromDate && <Badge variant="secondary">From: {new Date(filters.fromDate).toLocaleDateString()}</Badge>}
                {filters.toDate && <Badge variant="secondary">To: {new Date(filters.toDate).toLocaleDateString()}</Badge>}
              </div>
            </div>
          </div>
        )}

        <h2 className="mb-6 text-2xl font-bold">
          {userRole?.toLowerCase() === "checker"
            ? `Agreements (${sortedAndFiltered.length} - Your Submissions)`
            : `Agreements (${sortedAndFiltered.length})`
          }
        </h2>

        {/* Show helpful message for checker role */}
        {userRole?.toLowerCase() === "checker" && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
            <div className="text-sm text-blue-800 dark:text-blue-400">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <Info className="size-4" /> Information for Checker Role
              </div>
              <p>
                You can view your submitted agreements below. Use the <strong>"Add Addendum"</strong> button to create modifications for existing agreements,
                or use the <strong>"New Agreement"</strong> tab to create new agreements.
              </p>
            </div>
          </div>
        )}
        <div className="rounded-lg border bg-card" style={{ maxWidth: '100%' }}>
          {/* Top Scrollbar */}
          <div
            ref={setTopScrollRef}
            className="overflow-x-auto border-b"
            style={{ height: '17px' }}
          >
            <div style={{ width: '1200px', height: '1px' }}></div>
          </div>
          {/* Main Table with Bottom Scrollbar */}
          <div ref={setBottomScrollRef} className="overflow-x-auto">
            <table className="min-w-[1200px] w-full caption-bottom text-sm">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="min-w-[80px]">Sr. No</TableHead>
                  <TableHead className="min-w-[150px]">Client Name</TableHead>
                  <TableHead className="min-w-[120px]">Client Site</TableHead>
                  <TableHead className="min-w-[180px]">WO / PO / LOI / Email</TableHead>
                  <TableHead className="min-w-[100px]">Entity Type</TableHead>
                  <TableHead className="min-w-[120px]">Submitted Date</TableHead>
                  <TableHead className="min-w-[200px]">Important Clauses</TableHead>
                  <TableHead className="min-w-[80px]">Priority</TableHead>
                  <TableHead className="min-w-[120px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Addendums</TableHead>
                  <TableHead className="min-w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                      {userRole?.toLowerCase() === "checker"
                        ? "No agreements submitted yet. Use the 'New Agreement' tab to create your first agreement."
                        : "No agreements submitted yet. Agreements submitted by checkers will appear here."
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAndFiltered.map((row, i) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-center">{i + 1}</TableCell>
                      <TableCell className="font-semibold">{row.client}</TableCell>
                      <TableCell className="text-muted-foreground">{row.site}</TableCell>
                      <TableCell className="min-w-[120px]">
                        <DocumentLinks
                          uploadStatuses={row.originalAgreement.uploadStatuses || {}}
                          documents={[
                            { type: 'WO', label: 'WO' },
                            { type: 'PO', label: 'PO' },
                            { type: 'LOI', label: 'LOI' },
                            { type: 'EmailApproval', label: 'Email' }
                          ]}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.entityType}</TableCell>
                      <TableCell className="text-muted-foreground">{row.date}</TableCell>
                      <TableCell className="min-w-[150px]">
                        <ErrorBoundary>
                          {getImportantClauses(row.originalAgreement, addendums?.addendums || [])}
                        </ErrorBoundary>
                      </TableCell>
                      <TableCell>
                        {priorityBadge(row.priority)}
                      </TableCell>
                      <TableCell className="min-w-[200px] align-top">
                        <div className="mb-3">
                          <Badge className={statusBadgeClass(row.status)}>{row.status}</Badge>
                        </div>

                        {row.status !== "Approved" && (
                          <div className="space-y-3">
                            <Textarea
                              className="text-sm"
                              placeholder="Enter progress notes..."
                              rows={2}
                              value={row.statusProgress?.notes || ""}
                              onChange={(e) => handleStatusProgressUpdate(row.id, "notes", e.target.value)}
                            />

                            <div className="flex items-center gap-2">
                              <Input
                                type="date"
                                className="flex-1"
                                value={row.statusProgress?.date || ""}
                                onChange={(e) => handleStatusProgressUpdate(row.id, "date", e.target.value)}
                              />
                              <Button size="sm" onClick={() => handleSaveStatusProgress(row.id)} title="Save progress">
                                Save
                              </Button>
                            </div>

                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto w-full justify-start px-0"
                              onClick={() => handleViewStatusHistory(row.id, row.client)}
                              title="View status history"
                            >
                              View History ({row.statusHistory?.length || 0})
                            </Button>
                          </div>
                        )}

                        {row.status === "Approved" && (
                          <div className="mt-3 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400">
                            <CheckCircle2 className="size-4" /> Approved - No further action required
                          </div>
                        )}
                      </TableCell>

                      {/* Addendums Count Column */}
                      <TableCell className="text-center">
                        {row.addendumsCount > 0 ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                              {row.addendumsCount}
                            </div>
                            {row.addendumsCount === 1 ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-amber-600 dark:text-amber-400"
                                title="View addendum"
                                onClick={() => {
                                  const agreementAddendums = (addendums?.addendums || []).filter(addendum =>
                                    addendum.parentAgreementId === row.originalAgreement.id
                                  );
                                  if (agreementAddendums.length === 1) {
                                    handleViewAddendum(agreementAddendums[0]);
                                  }
                                }}
                              >
                                <Eye className="size-4" />
                              </Button>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon-sm" className="text-amber-600 dark:text-amber-400" title="View addendums">
                                    <Eye className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-64">
                                  <DropdownMenuLabel>Select addendum to view</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {(addendums?.addendums || [])
                                    .filter(addendum => addendum.parentAgreementId === row.originalAgreement.id)
                                    .map((addendum) => (
                                      <DropdownMenuItem key={addendum.id} onSelect={() => handleViewAddendum(addendum)}>
                                        <div className="flex w-full flex-col gap-1">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-medium">#{addendum.id}</span>
                                            <Badge className={cn(statusBadgeClass(addendum.status), "text-[10px]")}>
                                              {addendum.status}
                                            </Badge>
                                          </div>
                                          <span className="truncate text-xs text-muted-foreground" title={addendum.title}>
                                            {addendum.title}
                                          </span>
                                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Calendar className="size-3" /> {new Date(addendum.submittedDate).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </TableCell>

                      {/* Actions Column */}
                      <TableCell className="text-center">
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            title="Review & Take Action"
                            onClick={() => setDetails({ open: true, agreement: row })}
                          >
                            Review
                          </Button>

                          {userRole === "checker" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="gap-1 text-orange-700 dark:text-orange-400"
                              title="Edit Agreement"
                              onClick={() => handleEditAgreement(row.originalAgreement)}
                            >
                              <Pencil className="size-3.5" /> Edit
                            </Button>
                          )}

                          {userRole === "checker" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 border-green-600 text-green-700 hover:bg-green-50 dark:text-green-400"
                              title="Create New Addendum"
                              onClick={() => handleCreateAddendum(row.originalAgreement)}
                            >
                              <Plus className="size-3.5" /> Add Addendum
                            </Button>
                          )}

                          {userRole === "checker" && row.addendumsCount > 0 && (
                            <div className="flex flex-col gap-1">
                              {(addendums?.addendums || []).filter(addendum =>
                                addendum.parentAgreementId === row.originalAgreement.id
                              ).map((addendum) => (
                                <Button
                                  key={addendum.id}
                                  size="xs"
                                  variant="outline"
                                  className="gap-1 text-orange-700 dark:text-orange-400"
                                  title={`Edit Addendum: ${addendum.title}`}
                                  onClick={() => handleEditAddendum(addendum)}
                                >
                                  <Pencil className="size-3" /> #{addendum.id}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
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
        onEditAddendum={handleEditAddendum}
        onViewAddendum={handleViewAddendum}
      />

      <StatusHistoryModal
        open={statusHistoryModal.open}
        onClose={() => setStatusHistoryModal({ open: false, history: [], title: "" })}
        history={statusHistoryModal.history}
        title={statusHistoryModal.title}
      />

      {/* Addendum Details Modal */}
      <Dialog open={addendumDetailsModal.open} onOpenChange={(v) => { if (!v) setAddendumDetailsModal({ open: false, addendum: null }); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          {addendumDetailsModal.addendum && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="size-5" /> Addendum Details - #{addendumDetailsModal.addendum?.id || 'Unknown'}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Version:</span>
                  <Badge variant="secondary">v{addendumDetailsModal.addendum.version || "1.0"}</Badge>
                  {addendumDetailsModal.addendum.versionHistory && addendumDetailsModal.addendum.versionHistory.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({addendumDetailsModal.addendum.versionHistory.length} version{addendumDetailsModal.addendum.versionHistory.length > 1 ? 's' : ''})
                    </span>
                  )}
                </div>
              </DialogHeader>

              <p className="text-sm text-muted-foreground">Review and approve the addendum</p>

              {/* Addendum Information */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <b>Title:</b><br/>
                  {isEditing ? (
                    <Input
                      value={editingAddendum?.title || ""}
                      onChange={(e) => setEditingAddendum(prev => ({ ...prev, title: e.target.value }))}
                      className="mt-1"
                    />
                  ) : (
                    typeof addendumDetailsModal.addendum.title === 'string'
                      ? addendumDetailsModal.addendum.title
                      : 'Untitled Addendum'
                  )}
                </div>
                <div><b>Parent Agreement:</b><br/>{typeof addendumDetailsModal.addendum.parentAgreementTitle === 'string' ? addendumDetailsModal.addendum.parentAgreementTitle : (addendumDetailsModal.addendum.parentAgreementId || 'Unknown')}</div>
                <div><b>Submitted By:</b><br/><span className="inline-flex items-center gap-1"><User className="size-3.5" /> {typeof addendumDetailsModal.addendum.submittedBy === 'string' ? addendumDetailsModal.addendum.submittedBy : 'Unknown'}</span></div>
                <div><b>Submitted Date:</b><br/><span className="inline-flex items-center gap-1"><Calendar className="size-3.5" /> {addendumDetailsModal.addendum.submittedDate ? new Date(addendumDetailsModal.addendum.submittedDate).toLocaleDateString() : 'Unknown'}</span></div>
                <div>
                  <b>Effective Date:</b><br/>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editingAddendum?.effectiveDate ? editingAddendum.effectiveDate.split('T')[0] : ""}
                      onChange={(e) => setEditingAddendum(prev => ({ ...prev, effectiveDate: e.target.value }))}
                      className="mt-1"
                    />
                  ) : (
                    addendumDetailsModal.addendum.effectiveDate ? new Date(addendumDetailsModal.addendum.effectiveDate).toLocaleDateString() : 'Not specified'
                  )}
                </div>
                <div><b>Status:</b><br/>
                  <Badge className={statusBadgeClass(addendumDetailsModal.addendum.status)}>
                    {addendumDetailsModal.addendum.status}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="mb-2">Description</Label>
                {isEditing ? (
                  <Textarea
                    value={editingAddendum?.description || ""}
                    onChange={(e) => setEditingAddendum(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                ) : (
                  <div className="rounded border bg-muted/30 p-3 text-sm">
                    {typeof addendumDetailsModal.addendum.description === 'string'
                      ? addendumDetailsModal.addendum.description
                      : 'No description provided'}
                  </div>
                )}
              </div>

              {/* Reason and Impact */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2">Reason for Changes</Label>
                  {isEditing ? (
                    <Textarea
                      value={editingAddendum?.reason || ""}
                      onChange={(e) => setEditingAddendum(prev => ({ ...prev, reason: e.target.value }))}
                      rows={3}
                    />
                  ) : (
                    <div className="rounded border bg-muted/30 p-3 text-sm">
                      {typeof addendumDetailsModal.addendum.reason === 'string'
                        ? addendumDetailsModal.addendum.reason
                        : 'No reason provided'}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="mb-2">Impact Assessment</Label>
                  {isEditing ? (
                    <Textarea
                      value={editingAddendum?.impact || ""}
                      onChange={(e) => setEditingAddendum(prev => ({ ...prev, impact: e.target.value }))}
                      rows={3}
                    />
                  ) : (
                    <div className="rounded border bg-muted/30 p-3 text-sm">
                      {typeof addendumDetailsModal.addendum.impact === 'string'
                        ? addendumDetailsModal.addendum.impact
                        : 'No impact assessment provided'}
                    </div>
                  )}
                </div>
              </div>

              {/* Clause Modifications */}
              {addendumDetailsModal.addendum.clauseModifications && addendumDetailsModal.addendum.clauseModifications.length > 0 && (
                <div>
                  <Label className="mb-2">Clause Modifications</Label>
                  <div className="rounded border bg-muted/30 p-3">
                    {addendumDetailsModal.addendum.clauseModifications.map((mod, index) => (
                      <div key={index} className="mb-3 rounded border-l-4 border-blue-300 bg-card p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Clause {mod.clauseNumber}</span>
                            <Badge className={cn(modificationBadgeClass(mod.modificationType), "gap-1")}>
                              <ModificationIcon type={mod.modificationType} className="size-3" />
                              {modificationLabel(mod.modificationType)}
                            </Badge>
                          </div>
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => handleViewClauseHistory(mod.clauseNumber, mod.clauseTitle, [mod])}
                            title="View History"
                          >
                            <ClipboardList className="size-3" /> History
                          </Button>
                        </div>
                        <div className="mb-1 text-xs text-muted-foreground">
                          <strong>Details:</strong> {mod.details}
                        </div>
                        {mod.previousValue && mod.newValue && (
                          <div className="text-xs text-muted-foreground">
                            <span className="line-through">{mod.previousValue}</span> → <span className="text-green-600 dark:text-green-400">{mod.newValue}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploaded Files */}
              {addendumDetailsModal.addendum.uploadedFiles && Object.keys(addendumDetailsModal.addendum.uploadedFiles).length > 0 && (
                <div>
                  <Label className="mb-2">Uploaded Documents</Label>
                  <div className="space-y-3">
                    {Object.entries(addendumDetailsModal.addendum.uploadedFiles).map(([key, file]) => (
                      <div key={key} className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground">{key}:</span>
                          <span className="text-sm font-medium">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (file.isDemo) {
                              toast.error("This is a demo file and cannot be opened.");
                            } else if (file.url) {
                              window.open(file.url, '_blank');
                            } else if (file instanceof File) {
                              const url = URL.createObjectURL(file);
                              window.open(url, '_blank');
                            }
                          }}
                          className={cn(
                            "text-sm font-medium",
                            file.isDemo ? 'cursor-not-allowed text-muted-foreground' : 'text-primary hover:underline'
                          )}
                          title={file.isDemo ? 'Demo file - cannot be opened' : 'Click to open in new tab'}
                        >
                          {file.isDemo ? 'Demo File' : 'Open Document'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Version History */}
              {addendumDetailsModal.addendum.versionHistory && addendumDetailsModal.addendum.versionHistory.length > 0 && (
                <div>
                  <Label className="mb-2">Version History</Label>
                  <div className="max-h-48 overflow-y-auto rounded border bg-muted/30 p-3">
                    {addendumDetailsModal.addendum.versionHistory.map((version, index) => (
                      <div key={index} className={cn(
                        "mb-3 rounded border-l-4 bg-card p-3",
                        version.type === 'addendum' ? 'border-blue-400' :
                        version.type === 'status_change' ? 'border-green-400' :
                        'border-border'
                      )}>
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">v{version.versionNumber}</span>
                            <Badge variant="secondary">
                              {version.type === 'addendum' ? 'Addendum' :
                               version.type === 'status_change' ? 'Status Change' :
                               'Update'}
                            </Badge>
                          </div>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="size-3" /> {new Date(version.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mb-1 text-xs text-muted-foreground">
                          <strong>Description:</strong> {version.description}
                        </div>
                        {version.user && (
                          <div className="text-xs text-muted-foreground">
                            <strong>By:</strong> {version.user}
                          </div>
                        )}
                        {version.changes && (
                          <div className="text-xs text-muted-foreground">
                            <strong>Changes:</strong> {version.changes}
                          </div>
                        )}
                        {version.legalCompliance && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            <strong>Risk Level:</strong>{" "}
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px]",
                                version.legalCompliance.riskLevel === 'HIGH' && "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
                                version.legalCompliance.riskLevel === 'MEDIUM' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
                                version.legalCompliance.riskLevel === 'LOW' && "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                              )}
                            >
                              {version.legalCompliance.riskLevel}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Change Section - For Approvers */}
              {userRole?.toLowerCase() === "approver" && (
                <div className="border-t pt-6">
                  <h4 className="mb-3 font-semibold">Change Addendum Status</h4>

                  <div className="mb-4 flex items-center gap-3">
                    <Select
                      value={pendingStatusChanges[addendumDetailsModal.addendum.id] || addendumDetailsModal.addendum.status}
                      onValueChange={(value) => {
                        setPendingStatusChanges(prev => ({
                          ...prev,
                          [addendumDetailsModal.addendum.id]: value
                        }));
                      }}
                    >
                      <SelectTrigger className="min-w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>

                    {pendingStatusChanges[addendumDetailsModal.addendum.id] && pendingStatusChanges[addendumDetailsModal.addendum.id] !== addendumDetailsModal.addendum.status && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          const addendumId = addendumDetailsModal.addendum.id;
                          const newStatus = pendingStatusChanges[addendumId];
                          if (onAddendumStatusUpdate) {
                            onAddendumStatusUpdate(addendumId, newStatus);
                            setPendingStatusChanges(prev => {
                              const updated = { ...prev };
                              delete updated[addendumId];
                              return updated;
                            });
                          }
                        }}
                      >
                        Save Status
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setAddendumDetailsModal({ open: false, addendum: null })}
                    >
                      Close
                    </Button>
                  </div>

                  <div className="mb-2 text-sm text-muted-foreground">
                    Current Status: <span className="font-semibold text-foreground">{addendumDetailsModal.addendum.status}</span>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
                    <Lightbulb className="size-4 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm text-blue-800 dark:text-blue-400">
                      Select a new status from the dropdown above, then click "Save Status" to apply the change. Use "Close" to exit.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                {userRole?.toLowerCase() === "checker" &&
                 addendumDetailsModal.addendum.status !== "Approved" &&
                 addendumDetailsModal.addendum.status !== "Rejected" && (
                  <>
                    {!isEditing ? (
                      <Button variant="secondary" className="gap-2" onClick={() => handleEditAddendum(addendumDetailsModal.addendum)}>
                        <Pencil className="size-4" /> Edit Addendum
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" onClick={handleCancelAddendumEdit}>
                          Cancel
                        </Button>
                        <Button className="gap-2" onClick={handleSaveAddendumChanges}>
                          <Save className="size-4" /> Save Changes
                        </Button>
                      </>
                    )}
                  </>
                )}
                <Button variant="outline" onClick={() => setAddendumDetailsModal({ open: false, addendum: null })}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Clause History Modal */}
      <Dialog open={clauseHistoryModal.open} onOpenChange={(v) => { if (!v) setClauseHistoryModal({ open: false, clause: null, modifications: [] }); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          {clauseHistoryModal.clause && (
            <>
              <DialogHeader>
                <DialogTitle>Clause History - {clauseHistoryModal.clause.title}</DialogTitle>
              </DialogHeader>

              <p className="text-sm text-muted-foreground">View and manage modifications for this clause.</p>

              {clauseHistoryModal.modifications.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <FileText className="mx-auto mb-2 size-10" />
                  <p className="text-lg font-medium">No modifications recorded for this clause.</p>
                  <p className="text-sm">This clause has not been modified by any addendums.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Original Clause Version */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                        <ClipboardList className="size-4" /> Original Version
                      </span>
                      <span className="text-xs text-muted-foreground">(Before any modifications)</span>
                    </div>
                    <div className="rounded border bg-card p-3 text-sm">
                      {clauseHistoryModal.clause.title || "Original clause content"}
                    </div>
                  </div>

                  {/* Modification History */}
                  {clauseHistoryModal.modifications.map((mod, index) => (
                    <div key={index} className="rounded-lg border bg-muted/30 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Addendum #{mod.addendumId}</span>
                          <Badge className={modificationBadgeClass(mod.modificationType)}>
                            {mod.modificationType}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(mod.addendumDate).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <div className="mb-2 text-sm font-medium text-muted-foreground">Previous Version:</div>
                          <div className="rounded border bg-card p-3 text-sm">
                            {mod.previousVersion || "Original clause content before this modification"}
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 text-sm font-medium text-muted-foreground">Changes Made:</div>
                          <div className="rounded border bg-card p-3 text-sm">
                            {mod.details}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-muted-foreground">
                        <strong>Addendum Title:</strong> {mod.addendumTitle} |
                        <strong> Status:</strong> {mod.addendumStatus}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setClauseHistoryModal({ open: false, clause: null, modifications: [] })}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
