import React from "react";
import { useDispatch } from "react-redux";
import { Download, AlertTriangle } from "lucide-react";
import { setViewModal } from "../slice/uiSlice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { downloadAgreementPdf } from "@/lib/agreementPdf";
import { statusBadgeClass } from "@/lib/status";

const getDaysUntilExpiry = (endDate) => {
  if (!endDate) return 0;
  const today = new Date();
  const expiry = new Date(endDate);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const ExpiringContractModal = ({ open, agreement, onClose }) => {
  const dispatch = useDispatch();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      dispatch(setViewModal({ open: false, agreement: null }));
    }
  };

  if (!agreement) return null;

  const daysLeft = getDaysUntilExpiry(agreement.endDate);
  const urgencyClass =
    daysLeft <= 7 ? "text-red-600 dark:text-red-400" :
    daysLeft <= 15 ? "text-orange-600 dark:text-orange-400" :
    "text-yellow-600 dark:text-yellow-400";
  const urgencyBannerClass =
    daysLeft <= 7 ? "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10" :
    "border-yellow-200 bg-yellow-50 dark:border-yellow-500/30 dark:bg-yellow-500/10";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-h-[90vh] w-full overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agreement Details &mdash; {agreement.id}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">Client</p>
              <p className="text-sm text-foreground">{agreement.selectedClient || "Not specified"}</p>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">Branches</p>
              <p className="text-sm text-foreground">
                {Array.isArray(agreement.selectedBranches) && agreement.selectedBranches.length > 0
                  ? agreement.selectedBranches.map(branch => branch.name || branch).join(", ")
                  : "Not specified"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">Submitted Date</p>
              <p className="text-sm text-foreground">
                {agreement.submittedDate ? new Date(agreement.submittedDate).toLocaleDateString() : "Not specified"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">Agreement Type</p>
              <p className="text-sm text-foreground">{agreement.agreementType || "N/A"}</p>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">Total Value</p>
              <p className="text-sm text-foreground">
                {agreement.totalValue ? `${agreement.currency || "USD"} ${agreement.totalValue.toLocaleString()}` : "N/A"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">Status</p>
              <Badge className={statusBadgeClass(agreement.status || "Pending Review")}>
                {agreement.status || "Pending Review"}
              </Badge>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">Entity Type</p>
              <p className="text-sm text-foreground">{agreement.entityType || "N/A"}</p>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">Approved Date</p>
              <p className="text-sm text-foreground">{agreement.approvedDate ? new Date(agreement.approvedDate).toLocaleDateString() : "N/A"}</p>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">Priority</p>
              <p className="text-sm text-foreground">{agreement.priority || "N/A"}</p>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">Department</p>
              <p className="text-sm text-foreground">{agreement.selectedDepartment || "N/A"}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-lg border p-4 ${urgencyBannerClass}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`size-4 ${urgencyClass}`} />
              <div>
                <h3 className="text-sm font-medium text-foreground">Contract Expiry</h3>
                <p className="text-sm text-muted-foreground">
                  Expires on {agreement.endDate ? new Date(agreement.endDate).toLocaleDateString() : "Not specified"}
                </p>
              </div>
            </div>
            <span className={`text-lg font-bold ${urgencyClass}`}>
              {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)} days ago` : `${daysLeft} days left`}
            </span>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={() => downloadAgreementPdf(agreement)}
          >
            <Download className="size-4" /> Download PDF
          </Button>
          <Button onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExpiringContractModal;
