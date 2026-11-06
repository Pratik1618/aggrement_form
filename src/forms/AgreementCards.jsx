import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  FileText,
  FilePlus2,
  Pencil,
  Eye,
  X,
  ArrowLeft,
  ClipboardList,
  Inbox,
} from "lucide-react";
import { useAppState } from "../hooks/useRedux";
import { statusBadgeClass, priorityBadgeClass } from "../lib/status";
import { formatDate } from "@/lib/dates";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import AddendumForm from "./AddendumForm";

const getBranchNames = (branches) => {
  if (!branches || branches.length === 0) return null;
  return branches.map(branch => (typeof branch === 'string' ? branch : branch.name)).join(", ");
};

const AgreementCards = ({
  agreements,
  onEditAgreement,
  onAddendumStatusUpdate,
  userRole,
  onAddendumSubmit,
}) => {
  const { ui, addendums } = useAppState();
  const { actions: uiActions } = ui;

  const [showAddendumForm, setShowAddendumForm] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [editingAddendum, setEditingAddendum] = useState(null);
  const [viewingAgreement, setViewingAgreement] = useState(null);
  const [selectedAddendum, setSelectedAddendum] = useState(null);
  const [showAddendumModal, setShowAddendumModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  const sortedAgreements = [...agreements].sort((a, b) =>
    new Date(b.submittedDate) - new Date(a.submittedDate)
  );

  const agreementAddendumsMap = useMemo(() => {
    const map = new Map();
    if (agreements && addendums?.addendums) {
      agreements.forEach((agreement) => {
        map.set(agreement.id, addendums.addendums.filter(add => add.parentAgreementId === agreement.id));
      });
    }
    return map;
  }, [agreements, addendums?.addendums]);

  const handleAddendumClick = (agreement) => {
    uiActions.setEditingAddendum({
      parentAgreementId: agreement.id,
      parentAgreementTitle: agreement.clientName || agreement.title || `Agreement ${agreement.id}`,
      parentAgreementBranches: getBranchNames(agreement.selectedBranches) || "All Branches",
    });
    uiActions.setShowAddendumForm(true);
  };

  const handleEditAddendum = (addendum) => {
    uiActions.setEditingAddendum(addendum);
    uiActions.setShowAddendumForm(true);
  };

  const handleAddendumSubmit = (addendumData) => {
    onAddendumSubmit?.(addendumData);
    setShowAddendumForm(false);
    setSelectedAgreement(null);
    setEditingAddendum(null);
  };

  const handleEditComplete = () => {
    setEditingAddendum(null);
    setShowAddendumForm(false);
    setSelectedAgreement(null);
  };

  const handleReviewAddendum = (addendum) => {
    setSelectedAddendum(addendum);
    setShowAddendumModal(true);
  };

  const closeAddendumModal = () => {
    setShowAddendumModal(false);
    setSelectedAddendum(null);
    setPendingStatusChange(null);
  };

  const handleOpenDocument = (name, size, type) => {
    toast(`${name}`, { description: `${type} • ${size}` });
  };

  if (!agreements || agreements.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-b-2 border-primary" />
            <p className="text-muted-foreground">Loading agreements...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showAddendumForm) {
    return (
      <div className="px-8 py-6">
        <Button variant="ghost" className="mb-6 gap-2 px-0" onClick={() => setShowAddendumForm(false)}>
          <ArrowLeft className="size-4" />
          Back to Agreements
        </Button>
        <AddendumForm
          onSubmit={handleAddendumSubmit}
          editingAddendum={editingAddendum}
          onEditComplete={handleEditComplete}
          parentAgreement={selectedAgreement}
          userRole={userRole}
        />
      </div>
    );
  }

  if (viewingAgreement) {
    const agreementAddendums = agreementAddendumsMap.get(viewingAgreement.id) || [];
    const clausesWithDocuments = (viewingAgreement.importantClauses || []).filter((clause) => {
      if (!clause || typeof clause !== 'object') return false;
      if (Array.isArray(clause.documents) && clause.documents.length > 0) return true;
      if (clause.file) return true;
      return false;
    });
    const hasAnyUploadedDocuments = viewingAgreement.uploadStatuses &&
      Object.values(viewingAgreement.uploadStatuses).some(status => status?.uploaded);

    return (
      <div className="px-8 py-6">
        <Button variant="ghost" className="mb-6 gap-2 px-0" onClick={() => setViewingAgreement(null)}>
          <ArrowLeft className="size-4" />
          Back to Agreements
        </Button>

        <Card>
          <div className="flex items-center justify-between border-b bg-muted/40 px-6 py-4">
            <div className="flex items-center gap-4">
              <FileText className="size-6 text-primary" />
              <div>
                <h1 className="text-xl font-semibold">
                  Agreement Details - {viewingAgreement.selectedClient}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Agreement ID: {viewingAgreement.id} • Submitted on {formatDate(viewingAgreement.submittedDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusBadgeClass(viewingAgreement.status)}>{viewingAgreement.status}</Badge>
              {userRole?.toLowerCase() !== "checker" && viewingAgreement.priority && (
                <Badge className={priorityBadgeClass(viewingAgreement.priority)}>{viewingAgreement.priority}</Badge>
              )}
            </div>
          </div>

          <CardContent className="py-6">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="space-y-6">
                <section>
                  <h3 className="mb-3 border-b pb-2 text-base font-semibold">Client Information</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-muted-foreground">Client Name:</dt><dd>{viewingAgreement.selectedClient}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Department:</dt><dd>{viewingAgreement.selectedDepartment || "N/A"}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Entity Type:</dt><dd>{viewingAgreement.entityType || "N/A"}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Submitted By:</dt><dd className="capitalize">{viewingAgreement.submittedBy || "N/A"}</dd></div>
                  </dl>
                </section>

                <section>
                  <h3 className="mb-3 border-b pb-2 text-base font-semibold">Agreement Details</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-muted-foreground">Agreement Type:</dt><dd>{viewingAgreement.agreementType || "N/A"}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Start Date:</dt><dd>{formatDate(viewingAgreement.startDate)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">End Date:</dt><dd>{formatDate(viewingAgreement.endDate)}</dd></div>
                  </dl>
                </section>

                <section>
                  <h3 className="mb-3 border-b pb-2 text-base font-semibold">Branches</h3>
                  <div className="space-y-2">
                    {viewingAgreement.selectedBranches && viewingAgreement.selectedBranches.length > 0 ? (
                      viewingAgreement.selectedBranches.map((branch, idx) => (
                        <div key={branch.id || idx} className="rounded-lg bg-muted/50 p-3">
                          <div className="font-medium">{typeof branch === 'string' ? branch : branch.name}</div>
                          {typeof branch === 'object' && branch.address && <div className="text-sm text-muted-foreground">{branch.address}</div>}
                          {typeof branch === 'object' && branch.manager && <div className="text-sm text-muted-foreground">Manager: {branch.manager}</div>}
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No branches specified</span>
                    )}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section>
                  <h3 className="mb-3 border-b pb-2 text-base font-semibold">Important Clauses</h3>
                  <div className="space-y-2">
                    {clausesWithDocuments.length === 0 || !hasAnyUploadedDocuments ? (
                      <span className="text-sm text-muted-foreground">No clauses with documents uploaded</span>
                    ) : (
                      clausesWithDocuments.map((clause, idx) => {
                        const title = typeof clause === 'string' ? clause : (clause.title || 'Untitled Clause');
                        const doc = Array.isArray(clause.documents) && clause.documents.length > 0 ? clause.documents[0] : clause.file;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => doc
                              ? handleOpenDocument(doc.name, doc.size, doc.type)
                              : toast.info(`${title}: no document uploaded for this clause.`)}
                            className="flex w-full items-center gap-2 rounded-lg bg-blue-50 p-3 text-left transition-colors hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20"
                          >
                            <ClipboardList className="size-4 text-blue-600" />
                            <span>{title}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 border-b pb-2 text-base font-semibold">Documents</h3>
                  <div className="space-y-2">
                    {viewingAgreement.uploadedFiles && Object.keys(viewingAgreement.uploadedFiles).length > 0 ? (
                      Object.entries(viewingAgreement.uploadedFiles).map(([type, file]) => (
                        <div key={type} className="flex items-center justify-between rounded-lg bg-green-50 p-3 dark:bg-green-500/10">
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-green-600" />
                            <span>{type}: {file.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{file.size}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No documents uploaded</span>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 border-b pb-2 text-base font-semibold">Addendums</h3>
                  <div className="space-y-2">
                    {agreementAddendums.length > 0 ? (
                      agreementAddendums.map((addendum) => (
                        <div key={addendum.id} className="rounded-lg bg-purple-50 p-3 dark:bg-purple-500/10">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FilePlus2 className="size-4 text-purple-600" />
                              <span className="font-medium">{addendum.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={statusBadgeClass(addendum.status)}>{addendum.status}</Badge>
                              <Button size="sm" variant="outline" className="gap-1" onClick={() => handleReviewAddendum(addendum)}>
                                <Eye className="size-3.5" />
                                Review
                              </Button>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">{addendum.description}</div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Effective: {formatDate(addendum.effectiveDate)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No addendums yet</span>
                    )}
                  </div>
                </section>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-t pt-6">
              <div className="flex items-center gap-3">
                <Button
                  className="gap-2"
                  onClick={() => {
                    uiActions.setEditingAddendum({
                      parentAgreementId: viewingAgreement.id,
                      parentAgreementTitle: viewingAgreement.clientName || viewingAgreement.title || `Agreement ${viewingAgreement.id}`,
                      parentAgreementBranches: getBranchNames(viewingAgreement.selectedBranches) || "All Branches",
                    });
                    uiActions.setShowAddendumForm(true);
                    setViewingAgreement(null);
                  }}
                >
                  <FilePlus2 className="size-4" />
                  Add Addendum
                </Button>
                <span className="text-sm text-muted-foreground">
                  {agreementAddendums.length} addendum{agreementAddendums.length !== 1 ? 's' : ''} attached
                </span>
              </div>

              <div className="flex items-center gap-3">
                {userRole === "Checker" && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      onEditAgreement(viewingAgreement);
                      setViewingAgreement(null);
                    }}
                  >
                    <Pencil className="size-4" />
                    Edit Agreement
                  </Button>
                )}
                <Button variant="secondary" className="gap-2" onClick={() => setViewingAgreement(null)}>
                  <X className="size-4" />
                  Close
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Agreements</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage and review all agreements in chronological order</p>
      </div>

      {sortedAgreements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="mx-auto mb-4 size-10 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No Agreements Yet</h3>
            <p className="text-muted-foreground">Create your first agreement to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedAgreements.map((agreement) => {
            const agreementAddendums = agreementAddendumsMap.get(agreement.id) || [];
            const branchNames = getBranchNames(agreement.selectedBranches);

            return (
              <Card key={agreement.id} className="overflow-hidden pt-0">
                <div className="flex items-center justify-between border-b bg-muted/40 px-6 py-4">
                  <div className="flex items-center gap-4">
                    <FileText className="size-6 text-primary" />
                    <div>
                      <h3 className="font-semibold">Agreement #{agreement.id}</h3>
                      <p className="text-sm text-muted-foreground">
                        Submitted on {formatDate(agreement.submittedDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusBadgeClass(agreement.status)}>{agreement.status}</Badge>
                    {userRole?.toLowerCase() !== "checker" && agreement.priority && (
                      <Badge className={priorityBadgeClass(agreement.priority)}>{agreement.priority}</Badge>
                    )}
                  </div>
                </div>

                <CardContent className="py-4">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <h4 className="mb-2 font-semibold">Client Details</h4>
                      <dl className="space-y-1.5 text-sm">
                        <div><dt className="inline text-muted-foreground">Client:</dt> <dd className="inline">{agreement.selectedClient}</dd></div>
                        <div><dt className="inline text-muted-foreground">Branches:</dt> <dd className="inline">{branchNames || "N/A"}</dd></div>
                        <div><dt className="inline text-muted-foreground">Submitted By:</dt> <dd className="inline capitalize">{agreement.submittedBy || "N/A"}</dd></div>
                      </dl>
                    </div>

                    <div>
                      <h4 className="mb-2 font-semibold">Agreement Details</h4>
                      <dl className="space-y-1.5 text-sm">
                        <div><dt className="inline text-muted-foreground">Start Date:</dt> <dd className="inline">{formatDate(agreement.startDate)}</dd></div>
                        <div><dt className="inline text-muted-foreground">End Date:</dt> <dd className="inline">{formatDate(agreement.endDate)}</dd></div>
                      </dl>
                    </div>

                    <div>
                      <h4 className="mb-2 font-semibold">Addendums</h4>
                      {agreementAddendums.length > 0 ? (
                        <div className="space-y-2">
                          {agreementAddendums.slice(0, 3).map((addendum) => (
                            <div key={addendum.id} className="flex items-center justify-between rounded bg-muted/50 px-3 py-2">
                              <span className="max-w-32 truncate text-sm font-medium">{addendum.title}</span>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  onClick={() => handleEditAddendum(addendum)}
                                  title="Edit Addendum"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Badge className={statusBadgeClass(addendum.status)}>{addendum.status}</Badge>
                              </div>
                            </div>
                          ))}
                          {agreementAddendums.length > 3 && (
                            <div className="text-center text-xs text-muted-foreground">
                              +{agreementAddendums.length - 3} more addendums
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No addendums yet</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t pt-4">
                    <div className="flex items-center gap-3">
                      <Button className="gap-2" onClick={() => handleAddendumClick(agreement)}>
                        <FilePlus2 className="size-4" />
                        Add Addendum
                      </Button>
                      {agreementAddendums.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {agreementAddendums.length} addendum{agreementAddendums.length !== 1 ? 's' : ''} attached
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {userRole === "Checker" && (
                        <Button variant="outline" className="gap-2" onClick={() => onEditAgreement(agreement)}>
                          <Pencil className="size-4" />
                          Edit Agreement
                        </Button>
                      )}
                      <Button variant="secondary" className="gap-2" onClick={() => setViewingAgreement(agreement)}>
                        <Eye className="size-4" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showAddendumModal && !!selectedAddendum} onOpenChange={(open) => !open && closeAddendumModal()}>
        <DialogContent className="max-w-2xl">
          {selectedAddendum && (
            <>
              <DialogHeader>
                <DialogTitle>Review Addendum - {selectedAddendum.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Title:</span>
                    <p className="mt-1">{selectedAddendum.title}</p>
                  </div>
                  <div>
                    <span className="font-semibold">Current Status:</span>
                    <p className="mt-1">{selectedAddendum.status}</p>
                  </div>
                </div>

                <div className="text-sm">
                  <span className="font-semibold">Description:</span>
                  <p className="mt-1">{selectedAddendum.description}</p>
                </div>

                <div className="text-sm">
                  <span className="font-semibold">Submitted By:</span>
                  <p className="mt-1">{selectedAddendum.submittedBy}</p>
                </div>

                <div className="text-sm">
                  <span className="font-semibold">Effective Date:</span>
                  <p className="mt-1">
                    {formatDate(selectedAddendum.effectiveDate, 'Not specified')}
                  </p>
                </div>
              </div>

              {userRole?.toLowerCase() === "approver" && (
                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-semibold">Change Status</h4>

                  <div className="flex items-center gap-3">
                    <Select
                      value={pendingStatusChange || selectedAddendum.status}
                      onValueChange={(value) => setPendingStatusChange(value)}
                    >
                      <SelectTrigger className="min-w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>

                    {pendingStatusChange && pendingStatusChange !== selectedAddendum.status && (
                      <Button
                        className="bg-green-600 text-white hover:bg-green-600/90"
                        onClick={() => {
                          onAddendumStatusUpdate?.(selectedAddendum.id, pendingStatusChange);
                          toast.success(`Addendum marked as ${pendingStatusChange}`);
                          setPendingStatusChange(null);
                        }}
                      >
                        Save Status
                      </Button>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Select a new status, then click "Save Status" to apply the change.
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button variant="secondary" onClick={closeAddendumModal}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgreementCards;
