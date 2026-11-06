import React from "react";
import { useDispatch } from "react-redux";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { setViewModal } from "../slice/uiSlice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { downloadAgreementPdf } from "@/lib/agreementPdf";
import { statusBadgeClass } from "@/lib/status";

const ViewModal = ({ open, agreement }) => {
  const dispatch = useDispatch();

  const handleClose = () => {
    dispatch(setViewModal({ open: false, agreement: null }));
  };

  const handleDownload = () => {
    try {
      downloadAgreementPdf(agreement);
      toast.success("Agreement PDF downloaded.");
    } catch {
      toast.error("Download failed. Please try again.");
    }
  };

  if (!agreement) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Agreement Details &mdash; {agreement.selectedClient || agreement.id}</DialogTitle>
        </DialogHeader>

        <div>
          <h3 className="mb-4 text-lg font-semibold text-foreground">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Client Name</p>
              <p className="mt-1 text-sm text-foreground">{agreement.selectedClient || "Not specified"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Branches</p>
              <p className="mt-1 text-sm text-foreground">
                {Array.isArray(agreement.selectedBranches) && agreement.selectedBranches.length > 0
                  ? agreement.selectedBranches.map(branch => branch.name || branch).join(", ")
                  : "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge className={`mt-1 ${statusBadgeClass(agreement.status || "Pending Review")}`}>
                {agreement.status || "Pending Review"}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Submitted Date</p>
              <p className="mt-1 text-sm text-foreground">
                {agreement.submittedDate ? new Date(agreement.submittedDate).toLocaleDateString() : "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">End Date</p>
              <p className="mt-1 text-sm text-foreground">
                {agreement.endDate ? new Date(agreement.endDate).toLocaleDateString() : "Not specified"}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-semibold text-foreground">Contact Information</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="mb-1 font-medium text-foreground">Client Email</h4>
              <p className="text-sm text-muted-foreground">{agreement.contactInfo?.clientEmail || agreement.clientEmail || "N/A"}</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">Client Phone</h4>
              <p className="text-sm text-muted-foreground">{agreement.contactInfo?.clientPhone || agreement.clientPhone || "N/A"}</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">I Smart Email</h4>
              <p className="text-sm text-muted-foreground">{agreement.contactInfo?.email || "N/A"}</p>
            </div>
            <div>
              <h4 className="mb-1 font-medium text-foreground">I Smart Phone</h4>
              <p className="text-sm text-muted-foreground">{agreement.contactInfo?.phone || "N/A"}</p>
            </div>
          </div>
        </div>

        {agreement.agreementDetails && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-foreground">Agreement Details</h3>
            <div className="rounded-lg border bg-muted/40 p-4">
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                {JSON.stringify(agreement.agreementDetails, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div>
          <h3 className="mb-4 text-lg font-semibold text-foreground">Important Clauses</h3>
          <div className="space-y-4">
            {(() => {
              const clauses = agreement.importantClauses || [];
              const clausesWithContent = clauses.filter(clause => clause.content || clause.placeholder || clause.file);

              if (clausesWithContent.length === 0) {
                return (
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">No important clauses specified</p>
                  </div>
                );
              }

              return clausesWithContent.map((clause, index) => (
                <div key={index} className="rounded-lg border bg-muted/40 p-4">
                  <h4 className="font-medium text-foreground">{clause.title || `Clause ${index + 1}`}</h4>
                  <div className="mt-2">
                    {clause.content && <p className="mb-2 text-sm text-muted-foreground">{clause.content}</p>}
                    {clause.placeholder && !clause.content && <p className="mb-2 text-sm text-muted-foreground">{clause.placeholder}</p>}
                    {clause.file && (
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          {clause.file.name || "Document uploaded"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({clause.file.size ? `${(clause.file.size / 1024).toFixed(1)} KB` : "Unknown size"})
                        </span>
                        {clause.file.dataUrl && (
                          <Button
                            variant="link"
                            className="h-auto p-0 text-xs"
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = clause.file.dataUrl;
                              link.download = clause.file.name;
                              link.click();
                            }}
                          >
                            Download
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-semibold text-foreground">Uploaded Documents</h3>
          <div className="space-y-2">
            {(() => {
              const uploadStatuses = agreement.uploadStatuses || {};
              const documentTypes = ["LOI", "WO", "PO", "EmailApproval"];
              const uploadedDocuments = documentTypes.filter(docType => uploadStatuses[docType]?.uploaded === true);

              if (uploadedDocuments.length === 0) {
                return (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-sm text-muted-foreground">No documents uploaded</p>
                  </div>
                );
              }

              return uploadedDocuments.map((docType, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                  <span className="text-sm font-medium text-foreground">{docType}</span>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400">Uploaded</Badge>
                </div>
              ));
            })()}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="size-4" /> Download PDF
          </Button>
          <Button onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewModal;
