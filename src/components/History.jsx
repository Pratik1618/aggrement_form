import React, { useState } from "react";
import { CheckCircle2, Download, Eye, ListChecks, FileText } from "lucide-react";
import { useAppState } from "../hooks/useRedux";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { statusBadgeClass } from "@/lib/status";

export default function History() {
  const { agreements } = useAppState();
  const { agreements: agreementsList } = agreements;
  const [searchTerm, setSearchTerm] = useState("");
  const [workflowDialog, setWorkflowDialog] = useState({ open: false, agreement: null });

  const approvedAgreements = agreementsList.filter(agreement =>
    agreement.approvalWorkflow && agreement.approvalWorkflow.finalApproval && agreement.approvalWorkflow.finalApproval.approved
  );

  const filteredAgreements = approvedAgreements.filter(agreement =>
    agreement.selectedClient?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAllBranches = (agreement) => {
    if (!agreement.selectedBranches || agreement.selectedBranches.length === 0) {
      return "No branches specified";
    }
    return agreement.selectedBranches.map(branch => branch.name || branch).join(", ");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b p-6">
          <h1 className="text-3xl font-bold text-foreground">Approved Agreements History</h1>
          <p className="mt-2 text-sm text-muted-foreground">View all approved agreements and their details</p>
        </div>

        <div className="border-b p-6">
          <div className="max-w-md">
            <label htmlFor="search" className="sr-only">Search agreements</label>
            <Input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by client name..."
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agreement ID</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Branches</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted Date</TableHead>
              <TableHead>Approved Date</TableHead>
              <TableHead>Approved By</TableHead>
              <TableHead>Final Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAgreements.map((agreement, index) => (
              <TableRow key={agreement.id || index}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {agreement.id || `HIST-${String(index + 1).padStart(3, "0")}`}
                    </span>
                    <Badge variant="secondary">Demo</Badge>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  {agreement.selectedClient || "Unknown Client"}
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  {getAllBranches(agreement)}
                </TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400">
                    <CheckCircle2 className="size-3.5" /> Approved
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  {formatDate(agreement.submittedDate)}
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  {formatDate(agreement.approvalWorkflow?.finalApproval?.approvedDate || agreement.approvedDate || agreement.lastModified)}
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-foreground">
                    {agreement.approvalWorkflow?.finalApproval?.approvedBy === "approver" ? "Approver" : "Unknown"}
                  </div>
                  <div className="text-xs text-muted-foreground">Final Approval</div>
                </TableCell>
                <TableCell>
                  <Badge className={statusBadgeClass(agreement.status)}>{agreement.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setWorkflowDialog({ open: true, agreement })}
                      disabled={!agreement.approvalWorkflow}
                    >
                      <ListChecks className="size-3.5" /> Workflow
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="size-3.5" /> View
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="size-3.5" /> Download
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredAgreements.length === 0 && (
          <div className="py-12 text-center">
            <FileText className="mx-auto size-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No approved agreements found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm ? `No agreements match "${searchTerm}"` : "Get started by creating a new agreement."}
            </p>
          </div>
        )}
      </div>

      <Dialog open={workflowDialog.open} onOpenChange={(open) => !open && setWorkflowDialog({ open: false, agreement: null })}>
        <DialogContent className="max-h-[85vh] w-full overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approval Workflow Details</DialogTitle>
          </DialogHeader>
          {workflowDialog.agreement?.approvalWorkflow && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border bg-muted/40 p-4">
                <div><span className="font-medium">Final Approval:</span> {workflowDialog.agreement.approvalWorkflow.finalApproval.approved ? "Yes" : "No"}</div>
                <div><span className="font-medium">Approved By:</span> {workflowDialog.agreement.approvalWorkflow.finalApproval.approvedBy}</div>
                <div><span className="font-medium">Approved Date:</span> {formatDate(workflowDialog.agreement.approvalWorkflow.finalApproval.approvedDate)}</div>
                <div><span className="font-medium">Comments:</span> {workflowDialog.agreement.approvalWorkflow.finalApproval.finalComments}</div>
              </div>
              <div>
                <h4 className="mb-2 font-medium text-foreground">Workflow Steps</h4>
                <div className="space-y-2">
                  {workflowDialog.agreement.approvalWorkflow.steps?.map((step, i) => (
                    <div key={i} className="rounded-lg border bg-muted/40 p-3">
                      <div className="font-medium text-foreground">{step.step} ({step.status}) &bull; {step.userRole}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(step.timestamp)}</div>
                      <div className="mt-1 text-muted-foreground">{step.comments}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setWorkflowDialog({ open: false, agreement: null })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
