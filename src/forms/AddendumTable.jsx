import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { Download, Eye, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const openUploadedFile = (file, type) => {
  if (file.isDemo) {
    toast.info(`Demo file: ${file.name}. In a real application this would open the actual document.`);
  } else if (file.file) {
    try {
      const url = URL.createObjectURL(file.file);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error("Error opening file: " + error.message);
    }
  } else if (file.url) {
    window.open(file.url, "_blank");
  } else {
    toast.info(`File: ${file.name || type}. File type not supported for opening.`);
  }
};

const AddendumTable = ({ addendums = [], onStatusUpdate, onEditAddendum, userRole = "checker" }) => {
  const [filters, setFilters] = useState({
    parentAgreement: "",
    status: "",
    fromDate: "",
    toDate: "",
    search: "",
  });
  const [details, setDetails] = useState({ open: false, addendum: null });

  const transformedData = useMemo(() => {
    return addendums.map((addendum) => ({
      id: addendum.id,
      title: addendum.title,
      parentAgreement: addendum.parentAgreementTitle || addendum.parentAgreementId,
      description: addendum.description,
      reason: addendum.reason,
      impact: addendum.impact,
      effectiveDate: addendum.effectiveDate ? new Date(addendum.effectiveDate).toLocaleDateString() : "Not specified",
      submittedDate: addendum.submittedDate ? new Date(addendum.submittedDate).toLocaleDateString() : "Not specified",
      status: addendum.status,
      submittedBy: addendum.submittedBy,
      uploadedFiles: addendum.uploadedFiles,
      clauseModifications: addendum.clauseModifications,
      originalAddendum: addendum,
    }));
  }, [addendums]);

  const [data, setData] = useState(transformedData);

  useEffect(() => {
    setData(transformedData);
  }, [transformedData]);

  const uniqueParentAgreements = [...new Set(data.map(row => row.parentAgreement))];
  const uniqueStatuses = [...new Set(data.map(row => row.status))];

  const handleStatusChange = (addendumId, newStatus) => {
    setData(prev => prev.map(row =>
      row.id === addendumId ? { ...row, status: newStatus } : row
    ));
    onStatusUpdate?.(addendumId, newStatus);
  };

  const handleEditAddendum = (addendum) => {
    onEditAddendum?.(addendum.originalAddendum);
  };

  const filtered = data.filter(row => {
    const parentAgreementMatch = !filters.parentAgreement || row.parentAgreement === filters.parentAgreement;
    const statusMatch = !filters.status || row.status === filters.status;
    const searchMatch = !filters.search ||
      row.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      row.description.toLowerCase().includes(filters.search.toLowerCase()) ||
      row.reason.toLowerCase().includes(filters.search.toLowerCase());

    let dateMatch = true;
    if (filters.fromDate || filters.toDate) {
      const submittedDate = new Date(row.originalAddendum.submittedDate);
      const fromDate = filters.fromDate ? new Date(filters.fromDate) : null;
      const toDate = filters.toDate ? new Date(filters.toDate) : null;

      if (fromDate && toDate) {
        dateMatch = submittedDate >= fromDate && submittedDate <= toDate;
      } else if (fromDate) {
        dateMatch = submittedDate >= fromDate;
      } else if (toDate) {
        dateMatch = submittedDate <= toDate;
      }
    }

    return parentAgreementMatch && statusMatch && searchMatch && dateMatch;
  });

  const exportFilename = (base, ext) => {
    let filename = base;
    if (filters.fromDate || filters.toDate) {
      const fromDateStr = filters.fromDate ? filters.fromDate.replace(/-/g, "") : "start";
      const toDateStr = filters.toDate ? filters.toDate.replace(/-/g, "") : "end";
      filename += `_${fromDateStr}_to_${toDateStr}`;
    }
    return `${filename}.${ext}`;
  };

  const handleExportExcel = () => {
    const exportData = filtered.map((row, i) => ({
      "Sr. No": i + 1,
      "Addendum Title": row.title,
      "Parent Agreement": row.parentAgreement,
      "Description": row.description,
      "Reason": row.reason,
      "Effective Date": row.effectiveDate,
      "Submitted Date": row.submittedDate,
      "Status": row.status,
      "Submitted By": row.submittedBy,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Addendums");
    XLSX.writeFile(wb, exportFilename("addendums", "xlsx"));
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const columns = ["Sr. No", "Addendum Title", "Parent Agreement", "Description", "Effective Date", "Status", "Submitted By"];
    const rows = filtered.map((row, i) => [
      i + 1,
      row.title,
      row.parentAgreement,
      row.description.length > 30 ? row.description.substring(0, 30) + "..." : row.description,
      row.effectiveDate,
      row.status,
      row.submittedBy,
    ]);

    autoTable(doc, { head: [columns], body: rows, styles: { fontSize: 6 } });
    doc.save(exportFilename("addendums", "pdf"));
  };

  const activeFilterCount = [filters.parentAgreement, filters.status, filters.search, filters.fromDate, filters.toDate].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Button variant="outline" onClick={handleExportExcel}>
          <Download className="size-4" /> Export Excel
        </Button>
        <Button variant="outline" onClick={handleExportPDF}>
          <Download className="size-4" /> Export PDF
        </Button>
        <p className="text-sm text-muted-foreground">
          Use filters below to export addendums within specific criteria
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <Select value={filters.parentAgreement || "__all"} onValueChange={(v) => setFilters(f => ({ ...f, parentAgreement: v === "__all" ? "" : v }))}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All Parent Agreements" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All Parent Agreements</SelectItem>
              {uniqueParentAgreements.map(agreement => (
                <SelectItem key={agreement} value={agreement}>{agreement}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.status || "__all"} onValueChange={(v) => setFilters(f => ({ ...f, status: v === "__all" ? "" : v }))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All Statuses</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">From</span>
            <Input
              type="date"
              className="w-auto"
              value={filters.fromDate || new Date().toISOString().split("T")[0]}
              onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">To</span>
            <Input
              type="date"
              className="w-auto"
              value={filters.toDate || new Date().toISOString().split("T")[0]}
              onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))}
            />
          </div>

          <Input
            type="text"
            placeholder="Search addendums..."
            className="w-[220px]"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />

          <Button
            variant="ghost"
            onClick={() => setFilters({ parentAgreement: "", status: "", fromDate: "", toDate: "", search: "" })}
          >
            Clear Filters
          </Button>
        </div>

        {activeFilterCount > 0 && (
          <div className="mb-4 rounded-lg border bg-muted/40 p-3">
            <div className="text-sm">
              <span className="font-medium">Active Filters:</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {filters.parentAgreement && <Badge variant="secondary">Parent Agreement: {filters.parentAgreement}</Badge>}
                {filters.status && <Badge variant="secondary">Status: {filters.status}</Badge>}
                {filters.search && <Badge variant="secondary">Search: &quot;{filters.search}&quot;</Badge>}
                {filters.fromDate && <Badge variant="secondary">From: {new Date(filters.fromDate).toLocaleDateString()}</Badge>}
                {filters.toDate && <Badge variant="secondary">To: {new Date(filters.toDate).toLocaleDateString()}</Badge>}
              </div>
            </div>
          </div>
        )}

        <h2 className="mb-2 text-xl font-bold text-foreground">Addendums ({filtered.length})</h2>
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sr. No</TableHead>
                <TableHead>Addendum Title</TableHead>
                <TableHead>Parent Agreement</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No addendums found. Addendums created by checkers will appear here.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row, i) => (
                  <TableRow key={row.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate" title={row.title}>{row.title}</div>
                    </TableCell>
                    <TableCell className="max-w-[150px]">
                      <div className="truncate" title={row.parentAgreement}>{row.parentAgreement}</div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate" title={row.description}>{row.description}</div>
                    </TableCell>
                    <TableCell>{row.effectiveDate}</TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClass(row.status)}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="flex flex-col gap-1">
                        {Object.entries(row.uploadedFiles || {}).map(([type, file]) => (
                          <div key={type} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{type}:</span>
                            <button
                              onClick={() => openUploadedFile(file, type)}
                              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                              title={`Click to open ${file.name || type} in new tab`}
                            >
                              Open Document
                            </button>
                          </div>
                        ))}
                        {Object.keys(row.uploadedFiles || {}).length === 0 && (
                          <span className="text-xs text-muted-foreground">No documents</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 whitespace-nowrap">
                        <Button size="sm" variant="outline" onClick={() => setDetails({ open: true, addendum: row })}>
                          <Eye className="size-3.5" /> View
                        </Button>
                        {userRole === "Checker" && row.status === "Pending Review" && (
                          <Button size="sm" variant="outline" onClick={() => handleEditAddendum(row)}>
                            <Pencil className="size-3.5" /> Edit
                          </Button>
                        )}
                        {userRole === "Approver" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              const newStatus = row.status === "Pending Review" ? "Under Review" :
                                row.status === "Under Review" ? "Approved" : "Pending Review";
                              handleStatusChange(row.id, newStatus);
                            }}
                          >
                            <RefreshCw className="size-3.5" /> Status
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={details.open} onOpenChange={(open) => !open && setDetails({ open: false, addendum: null })}>
        <DialogContent className="max-h-[90vh] w-full overflow-y-auto sm:max-w-4xl">
          {details.addendum && (
            <>
              <DialogHeader>
                <DialogTitle>Addendum Details</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-lg border bg-muted/40 p-4">
                  <h4 className="mb-3 font-semibold text-foreground">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Addendum ID:</span> {details.addendum.id}</div>
                    <div><span className="font-medium">Title:</span> {details.addendum.title}</div>
                    <div><span className="font-medium">Parent Agreement:</span> {details.addendum.parentAgreement}</div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Status:</span>
                      <Badge className={statusBadgeClass(details.addendum.status)}>{details.addendum.status}</Badge>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/40 p-4">
                  <h4 className="mb-3 font-semibold text-foreground">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Effective Date:</span> {details.addendum.effectiveDate}</div>
                    <div><span className="font-medium">Submitted:</span> {details.addendum.submittedDate}</div>
                    <div><span className="font-medium">Submitted By:</span> {details.addendum.submittedBy}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/40 p-4">
                <h4 className="mb-3 font-semibold text-foreground">Description</h4>
                <p className="text-sm text-muted-foreground">{details.addendum.description}</p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-lg border bg-muted/40 p-4">
                  <h4 className="mb-3 font-semibold text-foreground">Reason</h4>
                  <p className="text-sm text-muted-foreground">{details.addendum.reason}</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-4">
                  <h4 className="mb-3 font-semibold text-foreground">Impact Assessment</h4>
                  <p className="text-sm text-muted-foreground">{details.addendum.impact}</p>
                </div>
              </div>

              {details.addendum.clauseModifications && details.addendum.clauseModifications.length > 0 && (
                <div className="rounded-lg border bg-muted/40 p-4">
                  <h4 className="mb-3 font-semibold text-foreground">Clause Modifications</h4>
                  <div className="space-y-3">
                    {details.addendum.clauseModifications.map((mod, index) => (
                      <div key={index} className="rounded-lg border-l-4 border-primary bg-card p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">
                            Clause {mod.clauseNumber}: {mod.clauseTitle || mod.clause}
                          </span>
                          <Badge
                            className={
                              (mod.modificationType || mod.action) === "Removed" || (mod.modificationType || mod.action) === "removed"
                                ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                                : (mod.modificationType || mod.action) === "New" || (mod.modificationType || mod.action) === "added"
                                ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
                            }
                          >
                            {mod.modificationType || mod.action}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <strong>Details:</strong> {mod.details || mod.description}
                        </div>
                        {mod.previousValue && mod.newValue && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            <span className="line-through">{mod.previousValue}</span> &rarr;{" "}
                            <span className="text-green-600 dark:text-green-400">{mod.newValue}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border bg-muted/40 p-4">
                <h4 className="mb-3 font-semibold text-foreground">Uploaded Documents</h4>
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                  {Object.entries(details.addendum.uploadedFiles || {}).map(([type, file]) => (
                    <div key={type} className="flex items-center gap-2">
                      <span className={`size-2.5 rounded-full ${file.uploaded ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                      <span className="capitalize">{type.replace(/([A-Z])/g, " $1").trim()}:</span>
                      {file.uploaded && (
                        <button
                          onClick={() => openUploadedFile(file, type)}
                          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                          title={`Click to open ${file.name || type} in new tab`}
                        >
                          Open Document
                        </button>
                      )}
                    </div>
                  ))}
                  {Object.keys(details.addendum.uploadedFiles || {}).length === 0 && (
                    <div className="text-muted-foreground">No documents uploaded</div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button onClick={() => setDetails({ open: false, addendum: null })}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddendumTable;
